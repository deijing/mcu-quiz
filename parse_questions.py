import zipfile
import xml.etree.ElementTree as ET
import json
import re

def parse_docx(file_path):
    with zipfile.ZipFile(file_path) as docx:
        xml_content = docx.read('word/document.xml')
    tree = ET.fromstring(xml_content)
    
    paragraphs = list(tree.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'))
    
    def get_para_data(p):
        runs = []
        for r in p.findall('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r'):
            txt = ''.join(r.itertext())
            if not txt:
                continue
            rPr = r.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}rPr')
            u = rPr.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}u') is not None if rPr is not None else False
            b = rPr.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}b') is not None if rPr is not None else False
            color = None
            if rPr is not None:
                c = rPr.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}color')
                if c is not None:
                    color = c.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val')
            runs.append({'text': txt, 'u': u, 'b': b, 'color': color})
        full_text = ''.join(r['text'] for r in runs).strip()
        return full_text, runs

    non_empty = []
    for p in paragraphs:
        text, runs = get_para_data(p)
        if text:
            non_empty.append((text, runs))
            
    print(f"Total non-empty paragraphs: {len(non_empty)}")
    return non_empty

non_empty = parse_docx('单片机习题（含答案）(2).docx')
