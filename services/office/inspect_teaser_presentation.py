import hashlib,json,zipfile
from pathlib import Path
import fitz
from pptx import Presentation

def inspect(data,native,reader):
 checks=[]
 def add(code,ok,detail): checks.append({"code":code,"outcome":"passed" if ok else "failed","detail":detail,"locator":{}})
 try:
  prs=Presentation(str(native)); text="\n".join(shape.text for slide in prs.slides for shape in slide.shapes if hasattr(shape,"text"))
  draft=data.get("content_draft") or {}; sections=draft.get("sections") or []; ids=[f"[CIT:{c}]" for s in sections for c in s.get("citations",[])]
  add("native_structure",len(prs.slides)==len(sections)+1 and "DEAL CONTROL / TEASER" in text and "proposal-only" in text.lower(),"Editable Native PPTX retains slide structure and proposal-only boundary.")
  add("revision_identity",data.get("revision_id") in text and data.get("audience") in text and data.get("purpose") in text,"Revision, audience and purpose are bound to the Native artifact.")
  add("citation_lineage",all(x in text for x in ids),"Every material section retains point-of-use citation markers.")
  with zipfile.ZipFile(native) as z:
   names=z.namelist(); xml=z.read("ppt/presentation.xml").decode("utf8",errors="ignore")
   add("native_editable",xml.count("<p:sldId")>=len(sections)+1 and any("slideMaster" in n for n in names) and not any("externalLinks" in n or "vbaProject" in n for n in names),"Native text/layout/theme package remains editable and has no active or external content.")
  pdf=fitz.open(reader); ptext="\n".join(p.get_text() for p in pdf)
  add("native_reader_parity",len(pdf)==len(prs.slides) and data.get("revision_id") in ptext and all(x in ptext for x in ids),"Reader Copy matches exact slide order, Revision and citations.")
  add("confidentiality",data.get("confidentiality","").upper() in ptext and "Source / citation zone" in ptext,"Confidentiality and source zones are visible in the Reader Copy.")
  add("proposal_only", "proposal-only" in ptext.lower() and "circulation" in ptext.lower(),"Reader preserves proposal-only / review boundary.")
 except Exception as exc: add("native_structure",False,str(exc))
 return {"revision_id":data.get("revision_id"),"checks":checks,"report":{"revision_id":data.get("revision_id"),"template_version":"teaser-1.0.0"}}
if __name__=="__main__":
 import sys
 result=inspect(json.loads(Path(sys.argv[1]).read_text()),Path(sys.argv[2]),Path(sys.argv[3])); Path(sys.argv[4]).write_text(json.dumps(result,indent=2))
