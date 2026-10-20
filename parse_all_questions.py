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
    return non_empty

def extract_tags(text):
    tags = []
    text_lower = text.lower()
    keywords = [
        ('8086', '8086微机'),
        ('8051', '51单片机'),
        ('c51', 'C51编程'),
        ('i2c', 'I2C总线'),
        ('spi', 'SPI总线'),
        ('pwm', 'PWM调速'),
        ('数码管', '数码管显示'),
        ('键盘', '按键/键盘'),
        ('中断', '中断系统'),
        ('定时器', '定时器/计数器'),
        ('串行口', '串行通信'),
        ('波特率', '串行通信'),
        ('a/d', '模数转换(A/D)'),
        ('d/a', '数模转换(D/A)'),
        ('步进电机', '步进电机'),
        ('直流电机', '直流电机'),
        ('psw', '寄存器与存储器'),
        ('ram', '存储器'),
        ('rom', '存储器')
    ]
    for kw, tag in keywords:
        if kw in text_lower and tag not in tags:
            tags.append(tag)
    if not tags:
        tags.append('单片机基础')
    return tags

def main():
    non_empty = parse_docx('单片机习题（含答案）(2).docx')
    print(f"Total non-empty paragraphs: {len(non_empty)}")

    all_questions = []
    qid = 1

    # 1. Section 1: 选择题 (0 to 204)
    s1 = non_empty[:204]
    curr_q = None
    for text, runs in s1:
        if text.startswith('解析：') or text.startswith('解析:'):
            if curr_q:
                curr_q['analysis'] = text[3:].strip()
        elif text.startswith('注：') or text.startswith('注:'):
            if curr_q:
                curr_q['note'] = (curr_q.get('note', '') + '\n' + text[2:].strip()).strip()
        else:
            ans_m = re.search(r'（\s*([A-D])\s*）', text)
            ans = ans_m.group(1) if ans_m else ''
            # Stem and options
            m_split = re.search(r'A[、\.](.*)', text)
            stem = text[:m_split.start()].strip() if m_split else text
            # Clean stem: replace （ [A-D] ） with （   ）
            stem = re.sub(r'（\s*[A-D]\s*）', '（   ）', stem)
            
            opts_part = 'A、' + m_split.group(1).strip() if m_split else ''
            opts = re.findall(r'([A-D])[、\.](.*?)(?=(?:[A-D][、\.]|$))', opts_part)
            options_dict = {letter: opt.strip() for letter, opt in opts}
            
            curr_q = {
                'id': qid,
                'type': 'choice',
                'type_name': '单选题',
                'stem': stem,
                'raw': text,
                'options': options_dict,
                'answer': ans,
                'analysis': '',
                'note': '',
                'tags': extract_tags(stem + ' ' + opts_part)
            }
            all_questions.append(curr_q)
            qid += 1

    print(f"Parsed {len([q for q in all_questions if q['type'] == 'choice'])} choice questions.")

    # 2. Section 2: 填空题 (204 to 348)
    s2 = non_empty[204:348]
    curr_q = None
    for text, runs in s2:
        if text.startswith('解析：') or text.startswith('解析:'):
            if curr_q:
                curr_q['analysis'] = text[3:].strip()
        elif text.startswith('注：') or text.startswith('注:'):
            if curr_q:
                curr_q['note'] = (curr_q.get('note', '') + '\n' + text[2:].strip()).strip()
        else:
            # Build stem with blanks and list of answers
            blanks = []
            stem_parts = []
            for r in runs:
                is_ans = r['u'] or (r['color'] and 'FF0000' in r['color'].upper())
                txt = r['text']
                if is_ans and txt.strip():
                    blanks.append(txt.strip())
                    stem_parts.append(f'【空{len(blanks)}：____】')
                else:
                    stem_parts.append(txt)
            
            stem = ''.join(stem_parts).strip()
            
            curr_q = {
                'id': qid,
                'type': 'blank',
                'type_name': '填空题',
                'stem': stem,
                'full_text': text,
                'blanks': blanks,
                'answer': '；'.join(blanks),
                'analysis': '',
                'note': '',
                'tags': extract_tags(text)
            }
            all_questions.append(curr_q)
            qid += 1

    print(f"Parsed {len([q for q in all_questions if q['type'] == 'blank'])} fill-in questions.")

    # 3. Section 3: 判断题 (349 to 551)
    s3 = non_empty[349:551]
    curr_q = None
    for text, runs in s3:
        if text.startswith('解析：') or text.startswith('解析:'):
            if curr_q:
                curr_q['analysis'] = text[3:].strip()
        elif text.startswith('注：') or text.startswith('注:'):
            if curr_q:
                curr_q['note'] = (curr_q.get('note', '') + '\n' + text[2:].strip()).strip()
        else:
            ans_m = re.search(r'（\s*([√×对错TF])\s*）', text)
            raw_ans = ans_m.group(1) if ans_m else '√'
            ans_bool = True if raw_ans in ['√', '对', 'T'] else False
            
            stem = re.sub(r'（\s*[√×对错TF]\s*）', '（   ）', text).strip()
            
            curr_q = {
                'id': qid,
                'type': 'judge',
                'type_name': '判断题',
                'stem': stem,
                'raw': text,
                'answer': '正确' if ans_bool else '错误',
                'answer_symbol': '√' if ans_bool else '×',
                'is_correct': ans_bool,
                'analysis': '',
                'note': '',
                'tags': extract_tags(stem)
            }
            all_questions.append(curr_q)
            qid += 1

    print(f"Parsed {len([q for q in all_questions if q['type'] == 'judge'])} judge questions.")

    # 4. Section 4: 问答题 (552 to 749)
    s4 = non_empty[552:749]
    curr_q = None
    state = 'PROMPT'
    for text, runs in s4:
        if text.startswith('解析：') or text.startswith('解析:'):
            if curr_q:
                curr_q['analysis'] = text[3:].strip()
                state = 'ANALYSIS'
        elif text.startswith('注：') or text.startswith('注:'):
            if curr_q:
                curr_q['note'] = (curr_q.get('note', '') + '\n' + text[2:].strip()).strip()
        elif text.startswith('答：') or text.startswith('答:'):
            state = 'ANSWER'
            if curr_q:
                curr_q['answer'] = text[2:].strip()
        else:
            if state == 'ANALYSIS' or curr_q is None:
                if curr_q:
                    all_questions.append(curr_q)
                    qid += 1
                curr_q = {
                    'id': qid,
                    'type': 'qa',
                    'type_name': '简答题',
                    'stem': text,
                    'answer': '',
                    'analysis': '',
                    'note': '',
                    'tags': extract_tags(text)
                }
                state = 'PROMPT'
            elif state == 'PROMPT':
                curr_q['stem'] += '\n' + text
                curr_q['tags'] = extract_tags(curr_q['stem'])
            elif state == 'ANSWER':
                curr_q['answer'] += '\n' + text

    if curr_q:
        all_questions.append(curr_q)
        qid += 1

    print(f"Parsed {len([q for q in all_questions if q['type'] == 'qa'])} QA questions.")

    # 5. Section 5: 程序综合题 (750 to end)
    s5 = non_empty[750:]
    curr_q = None
    state = 'PROMPT'
    for text, runs in s5:
        if text.startswith('解析：') or text.startswith('解析:'):
            if curr_q:
                curr_q['analysis'] = text[3:].strip()
                state = 'ANALYSIS'
        elif text.startswith('注：') or text.startswith('注:'):
            if curr_q:
                curr_q['note'] = (curr_q.get('note', '') + '\n' + text[2:].strip()).strip()
        elif text.startswith('答：') or text.startswith('答:'):
            state = 'ANSWER'
            if curr_q:
                curr_q['answer'] = text[2:].strip()
        else:
            if state == 'ANALYSIS' or curr_q is None:
                if curr_q:
                    all_questions.append(curr_q)
                    qid += 1
                curr_q = {
                    'id': qid,
                    'type': 'code',
                    'type_name': '程序题',
                    'stem': text,
                    'answer': '',
                    'analysis': '',
                    'note': '',
                    'tags': extract_tags(text)
                }
                state = 'PROMPT'
            elif state == 'PROMPT':
                curr_q['stem'] += '\n' + text
                curr_q['tags'] = extract_tags(curr_q['stem'])
            elif state == 'ANSWER':
                curr_q['answer'] += '\n' + text

    if curr_q:
        all_questions.append(curr_q)
        qid += 1

    print(f"Parsed {len([q for q in all_questions if q['type'] == 'code'])} programming questions.")
    print(f"Total parsed questions: {len(all_questions)}")

    # Save to JSON
    with open('questions.json', 'w', encoding='utf-8') as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)

    # Also save as JS file for direct inclusion in HTML
    with open('questions_data.js', 'w', encoding='utf-8') as f:
        f.write("window.QUESTIONS_DATA = " + json.dumps(all_questions, ensure_ascii=False, indent=2) + ";\n")

    print("Saved questions.json and questions_data.js successfully!")

if __name__ == '__main__':
    main()
