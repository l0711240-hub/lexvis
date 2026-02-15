import os
import re
import json
from docx import Document

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def parse_law_docx(file_path):
    try:
        doc = Document(file_path)
    except Exception as e:
        print(f"❌ {file_path} 읽기 실패: {e}")
        return None

    full_text = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    
    law_data = {
        "mst": f"local-law-{os.path.basename(file_path)}",
        "name": os.path.basename(file_path).replace('.docx', ''),
        "type": "법률",
        "department": "정보없음",
        "promulgDate": "",
        "enforcDate": "",
        "contents": []
    }

    # 메타데이터 추출 (상단 15줄 분석)
    header_area = " ".join(full_text[:15])
    
    enforc_m = re.search(r'시행\s*(\d{4}\.\s*\d{1,2}\.\s*\d{1,2})', header_area)
    if enforc_m: law_data["enforcDate"] = enforc_m.group(1).replace('.', '').replace(' ', '')

    promulg_m = re.search(r'제\d+호,\s*(\d{4}\.\s*\d{1,2}\.\s*\d{1,2})', header_area)
    if promulg_m: law_data["promulgDate"] = promulg_m.group(1).replace('.', '').replace(' ', '')

    # 부처 추출: "OOO부" 형태 또는 연락처 앞의 텍스트
    dept_m = re.search(r'([가-힣]+부)\s*\(', header_area)
    if dept_m: law_data["department"] = dept_m.group(1).strip()

    current_article = None

    for line in full_text:
        # 편/장/절
        if re.match(r'^제[\d\s]+편', line):
            law_data["contents"].append({"type": "part", "title": line, "children": []})
            continue
        if re.match(r'^제[\d\s]+장', line):
            target = get_last_container(law_data["contents"], "part")
            target.append({"type": "chapter", "title": line, "children": []})
            continue
        if re.match(r'^제[\d\s]+절', line):
            target = get_last_container(law_data["contents"], "chapter")
            target.append({"type": "section", "title": line, "children": []})
            continue

        # 조문 (가지번호 포함)
        article_match = re.match(r'^제(\d+(?:의\d+)?)조\s*\((.*?)\)(.*)', line)
        if article_match:
            if current_article:
                finalize_article(current_article)
                add_to_deepest_container(law_data["contents"], current_article)
            num, title, content = article_match.groups()
            current_article = {"type": "article", "num": num, "title": title, "content": content.strip(), "paragraphs": []}
            continue

        # 항/호/목
        para_match = re.match(r'^([①-⑳])\s*(.*)', line)
        if para_match and current_article:
            num, txt = para_match.groups()
            current_article["paragraphs"].append({"num": num, "content": txt.strip(), "items": []})
            continue

        item_match = re.match(r'^(\d+)\.\s*(.*)', line)
        if item_match and current_article and current_article["paragraphs"]:
            num, txt = item_match.groups()
            current_article["paragraphs"][-1]["items"].append({"num": num, "content": txt.strip(), "sub_items": []})
            continue

        sub_item_match = re.match(r'^([가-힣])\.\s*(.*)', line)
        if sub_item_match and current_article and current_article["paragraphs"]:
            curr_p = current_article["paragraphs"][-1]
            if curr_p["items"]:
                num, txt = sub_item_match.groups()
                curr_p["items"][-1]["sub_items"].append({"num": num, "content": txt.strip()})
                continue

    if current_article:
        finalize_article(current_article)
        add_to_deepest_container(law_data["contents"], current_article)

    return law_data

def get_last_container(base_list, level):
    if not base_list: return base_list
    last = base_list[-1]
    if last.get("type") == level: return last["children"]
    if "children" in last: return get_last_container(last["children"], level)
    return base_list

def add_to_deepest_container(root_list, article):
    curr = root_list
    while curr and isinstance(curr[-1], dict) and "children" in curr[-1]:
        curr = curr[-1]["children"]
    curr.append(article)

def finalize_article(article):
    content = article["content"].strip()
    if content.startswith("①"):
        match = re.match(r'^(①)\s*(.*)', content)
        if match:
            num, text = match.groups()
            article["paragraphs"].insert(0, {"num": num, "content": text, "items": []})
            article["content"] = ""
    for p in article["paragraphs"]:
        if "items" in p and not p["items"]: del p["items"]
        elif "items" in p:
            for i in p["items"]:
                if "sub_items" in i and not i["sub_items"]: del i["sub_items"]
    if not article["paragraphs"]: del article["paragraphs"]

# --- 실행 ---
files = [f for f in os.listdir(BASE_DIR) if f.endswith('.docx')]
if files:
    all_laws = [parse_law_docx(os.path.join(BASE_DIR, f)) for f in files]
    with open('law_converted.json', 'w', encoding='utf-8') as f:
        json.dump(all_laws, f, ensure_ascii=False, indent=2)
    print("✅ 부처 정보 및 날짜 포함 변환 완료!")