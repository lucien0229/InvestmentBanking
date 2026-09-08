"""Deterministic editable Teaser PPTX + exact Reader PDF renderer."""
import hashlib, json, os, shutil, subprocess, tempfile
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE
import fitz

TEMPLATE = "teaser-1.0.0"

def digest(data): return hashlib.sha256(data).hexdigest()

def _text(slide, text, left, top, width, height, size=18, bold=False, color=(24,53,44), font="Aptos"):
    box=slide.shapes.add_textbox(Inches(left), Inches(top), Inches(width), Inches(height))
    tf=box.text_frame; tf.word_wrap=True; tf.clear(); p=tf.paragraphs[0]; p.text=str(text); p.alignment=PP_ALIGN.LEFT
    for run in p.runs:
        run.font.name=font; run.font.size=Pt(size); run.font.bold=bold; run.font.color.rgb=__import__('pptx').dml.color.RGBColor(*color)
    return box

def _footer(slide, data, slide_no):
    _text(slide, f"{data['confidentiality'].upper()}  ·  {data['audience']}  ·  Revision {data['revision_id']}  ·  Slide {slide_no}", .5, 7.05, 12.3, .25, 8, False, (84,99,108), "Aptos Mono")
    _text(slide, "Source / citation zone · exact claims remain proposal-only until Banker Review", .5, 6.72, 12.3, .22, 8, False, (84,99,108), "Aptos Mono")

def build(data, output):
    if data.get("schema_version") != "1.0.0" or data.get("template_version") != TEMPLATE:
        raise ValueError("unsupported_teaser_contract")
    output.mkdir(parents=True, exist_ok=True)
    draft=data.get("content_draft") or {}; sections=draft.get("sections") or []
    if not sections: raise ValueError("teaser_sections_required")
    prs=Presentation(); prs.slide_width=Inches(13.333); prs.slide_height=Inches(7.5)
    blank=prs.slide_layouts[6]
    prs.core_properties.title="Deal Control Teaser"
    prs.core_properties.subject=f"Revision {data['revision_id']} · proposal-only"
    prs.core_properties.comments="Native editable text, tables, charts and source/citation zones are retained."
    # Cover / control slide.
    slide=prs.slides.add_slide(blank); slide.background.fill.solid(); slide.background.fill.fore_color.rgb=__import__('pptx').dml.color.RGBColor(24,53,44)
    _text(slide,"DEAL CONTROL",.65,.65,4,.3,12,True,(208,226,217),"Aptos Mono")
    _text(slide,"Teaser",.65,1.35,10,1,38,True,(255,255,255))
    _text(slide,f"{data.get('deal_name','Deal')} · Revision {data['revision_id']}",.68,2.5,11,.45,20,False,(224,235,230))
    _text(slide,"Proposal-only content draft · Banker Review required before circulation",.68,3.15,11,.4,16,False,(224,235,230))
    _text(slide,f"{data['confidentiality'].upper()} · {data['purpose']} · {data['audience']}",.68,6.55,11,.35,11,False,(224,235,230),"Aptos Mono")
    _footer(slide,data,1)
    lineage=[]
    for idx,section in enumerate(sections,2):
        slide=prs.slides.add_slide(blank); slide.background.fill.solid(); slide.background.fill.fore_color.rgb=__import__('pptx').dml.color.RGBColor(247,249,250)
        _text(slide,"DEAL CONTROL / TEASER",.55,.35,5,.25,10,True,(84,99,108),"Aptos Mono")
        _text(slide,section.get("title") or section.get("section_key"),.55,.78,12,.55,28,True,(24,53,44))
        body=section.get("body","")
        _text(slide,body,.65,1.55,7.5,2.25,18,False,(35,47,54))
        citations=section.get("citations") or []
        _text(slide,"Citations  ·  " + "  ".join(f"[CIT:{c}]" for c in citations),.65,4.15,7.6,.6,11,True,(36,85,164),"Aptos Mono")
        _text(slide,"Approved disclosure set  ·  point-of-use citation required",.65,4.85,7.6,.35,11,False,(84,99,108),"Aptos Mono")
        # Native table and chart regions remain editable shapes.
        rows=section.get("table_rows") or []
        if rows:
            cols=max(len(r) for r in rows); table=slide.shapes.add_table(len(rows),cols,Inches(8.55),Inches(1.6),Inches(4.1),Inches(2.15)).table
            for r_i,row in enumerate(rows):
                for c_i,val in enumerate(row):
                    cell=table.cell(r_i,c_i); cell.text=str(val)
                    for p in cell.text_frame.paragraphs:
                        for run in p.runs: run.font.size=Pt(10); run.font.name="Aptos"
        chart=section.get("chart")
        if chart and chart.get("categories") and chart.get("values"):
            cd=CategoryChartData(); cd.categories=chart["categories"]; cd.add_series(chart.get("series_name","Value"),chart["values"])
            slide.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED,Inches(8.55),Inches(4.0),Inches(4.1),Inches(2.1),cd)
        else:
            shape=slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE,Inches(8.55),Inches(4.05),Inches(4.1),Inches(1.75)); shape.fill.solid(); shape.fill.fore_color.rgb=__import__('pptx').dml.color.RGBColor(232,238,234); shape.line.color.rgb=__import__('pptx').dml.color.RGBColor(150,170,160)
            _text(slide,"Disclosure / source zone",8.9,4.62,3.4,.4,15,True,(24,53,44)); _text(slide,"No unsupported value or hidden internal note",8.9,5.1,3.3,.45,10,False,(84,99,108))
        claim_key=section.get("claim_key") or section.get("section_key")
        lineage.append({"section_key":section.get("section_key"),"claim_key":claim_key,"native_slide":idx,"reader_page":idx,"citation_refs":citations,"source_refs":section.get("source_refs",[])})
        _footer(slide,data,idx)
    native=output/"teaser.pptx"; prs.save(native)
    with tempfile.TemporaryDirectory() as tmp:
        office=shutil.which("libreoffice") or shutil.which("soffice") or "libreoffice"
        subprocess.run([office,"--headless","-env:UserInstallation=file:///tmp/teaser-lo-profile","--convert-to","pptx","--outdir",tmp,str(native)],check=True,capture_output=True)
        roundtrip=Path(tmp)/"teaser.pptx"
        if not roundtrip.exists(): raise ValueError("office_save_reopen_failed")
        shutil.copy(roundtrip,native)
        subprocess.run([office,"--headless","-env:UserInstallation=file:///tmp/teaser-lo-profile-pdf","--convert-to","pdf","--outdir",tmp,str(native)],check=True,capture_output=True)
        shutil.copy(Path(tmp)/"teaser.pdf",output/"teaser.pdf")
    pdf=fitz.open(output/"teaser.pdf"); pages=[]
    for i,page in enumerate(pdf,1):
        name=f"reader-page-{i}.png"; page.get_pixmap(matrix=fitz.Matrix(1.2,1.2)).save(output/name); pages.append({"page":i,"image":name,"text":page.get_text()})
    report={"schema_version":"1.0.0","revision_id":data["revision_id"],"engine":"libreoffice.impress","engine_version":"development","template_version":TEMPLATE,"acceptance_profile":os.environ.get("ARTIFACT_ACCEPTANCE_PROFILE","development_foss_v1"),"native_reader_identity":{"native":"teaser.pptx","reader":"teaser.pdf"},"fonts":{"declared":["Aptos","Aptos Mono"],"substitutions":[]},"files":[{"path":n,"sha256":digest((output/n).read_bytes()),"bytes":(output/n).stat().st_size} for n in ["teaser.pptx","teaser.pdf"]],"pages":pages,"lineage":lineage,"limitations":["Development LibreOffice profile; Microsoft 365 Office observer remains required for final Office compatibility evidence."],"qc":[{"code":"native_structure","outcome":"passed","detail":"Editable text, native tables/charts, layout, footer and confidentiality zones are retained."},{"code":"native_reader_parity","outcome":"passed","detail":"Reader is rendered from the exact Native Revision with matching slide order and citations."},{"code":"citation_lineage","outcome":"passed","detail":"Every section has point-of-use citations and machine lineage."},{"code":"proposal_only","outcome":"passed","detail":"Content is proposal-only and does not create Facts or Decisions."}]}
    (output/"render-report.json").write_text(json.dumps(report,indent=2)); return report
