"""LibreOffice's real recalculation/save API, isolated behind a local UNO pipe."""
from contextlib import contextmanager
from pathlib import Path
import subprocess
import atexit
import os
import signal
import tempfile
import time
import uuid
import uno
import pymupdf
from com.sun.star.beans import PropertyValue


def property_value(name, value):
    item = PropertyValue()
    item.Name, item.Value = name, value
    return item


# One Calc/UNO connection per isolated command. Restarting the UNO runtime
# between multiple exact-file opens in one Python interpreter can invalidate it.
_engine = None


def stop_engine():
    global _engine
    if _engine is None:return
    process=_engine['process']
    try:
        os.killpg(process.pid,signal.SIGTERM)
        process.wait(timeout=5)
    except ProcessLookupError:pass
    except subprocess.TimeoutExpired:
        os.killpg(process.pid,signal.SIGKILL)
        process.wait(timeout=5)
    _engine['profile'].cleanup()
    _engine=None


def desktop():
    global _engine
    if _engine is not None:return _engine['desktop']
    profile=tempfile.TemporaryDirectory(prefix='calc-profile-')
    pipe='ib_calc_'+uuid.uuid4().hex
    process=subprocess.Popen(['libreoffice','--headless','--nologo','--nodefault','--norestore',
        '-env:UserInstallation='+Path(profile.name).as_uri(),'--accept=pipe,name='+pipe+';urp;StarOffice.ServiceManager'],
        stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
    _engine={'process':process,'profile':profile}
    try:
        local=uno.getComponentContext()
        resolver=local.ServiceManager.createInstanceWithContext('com.sun.star.bridge.UnoUrlResolver',local)
        deadline=time.monotonic()+15
        while True:
            try:
                context=resolver.resolve('uno:pipe,name='+pipe+';urp;StarOffice.ComponentContext')
                break
            except Exception:
                if process.poll() is not None or time.monotonic()>=deadline:raise RuntimeError('libreoffice_start_failed')
                time.sleep(.1)
        current=context.ServiceManager.createInstanceWithContext('com.sun.star.frame.Desktop',context)
        _engine.update({'local_context':local,'context':context,'desktop':current})
        return current
    except Exception:
        stop_engine()
        raise


@contextmanager
def document(path):
    workbook=None
    try:
        workbook=desktop().loadComponentFromURL(Path(path).resolve().as_uri(),'_blank',0,
            (property_value('Hidden',True),property_value('MacroExecutionMode',0),property_value('UpdateDocMode',0)))
        if workbook is None:raise RuntimeError('libreoffice_open_failed')
        workbook.enableAutomaticCalculation(True)
        workbook.calculateAll()
        yield workbook
    except Exception as error:
        # UNO exceptions cannot accept Python traceback attributes from contextlib.
        raise RuntimeError(str(error)) from error
    finally:
        if workbook is not None:workbook.close(True)


atexit.register(stop_engine)


def save_xlsx(workbook, path):
    workbook.storeAsURL(Path(path).resolve().as_uri(),
        (property_value('FilterName', 'Calc MS Excel 2007 XML'), property_value('Overwrite', True)))


def export_pdf(workbook, path):
    # The pinned Calc 7.4 exporter emits PDF 1.6. Re-serialize its exact pages
    # through the PDF parser to the contracted PDF 1.7, then inspect those bytes.
    with tempfile.TemporaryDirectory(prefix='calc-pdf-') as temporary:
        raw = Path(temporary) / 'calc.pdf'
        workbook.storeToURL(raw.as_uri(),
            (property_value('FilterName', 'calc_pdf_Export'), property_value('Overwrite', True),
             property_value('FilterData', uno.Any('[]com.sun.star.beans.PropertyValue',
                (property_value('SelectPdfVersion', 0), property_value('ExportBookmarks', False))))))
        with pymupdf.open(raw) as source, pymupdf.open() as final:
            final.insert_pdf(source)
            final.set_metadata(source.metadata)
            final.save(path, garbage=4, deflate=True)


def export_native_previews(native, output, ranges):
    previews=[]
    with document(native) as workbook:
        for index,(name,cell_range) in enumerate(ranges,1):
            sheet=workbook.Sheets.getByName(name)
            workbook.CurrentController.setActiveSheet(sheet)
            workbook.CurrentController.select(sheet.getCellRangeByName(cell_range))
            image=f'native-page-{index}.png'
            workbook.storeToURL((output/image).resolve().as_uri(),
                (property_value('FilterName','calc_png_Export'),property_value('Overwrite',True),property_value('SelectionOnly',True)))
            previews.append({'sheet':name,'page':1,'image':image,'range':cell_range,'render_basis':'exact_xlsx_cell_selection'})
    return previews


def recalculate_values(path, rows):
    with document(path) as workbook:
        sheet = workbook.Sheets.getByName('Valuation')
        return [sheet.getCellRangeByName('E' + str(row)).Value for row in rows]
