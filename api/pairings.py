import json
from playwright.sync_api import sync_playwright

selector='table.MuiTable-root tbody tr'

def handler(request):
    url=request.GET.get('url')
    players=request.GET.get('players','')
    if not url:
        return {
            "statusCode":400,
            "body":json.dumps({"error": "URL not given!"})
        }
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True)
            page=browser.new_page()
            page.goto(url,timeout=15000)
            page.wait_for_selector(selector)
            rows=page.query_selector_all(selector)
            pairings=[]
            for row in rows:
                cells=row.query_selector_all('td')
                board_num=cells[0].inner_text().strip()
                black_info=cells[1].inner_text().strip()
                white_info=cells[2].inner_text().strip()
                result=cells[4].inner_text().strip()
                pairings.append({
                    "board_num": board_num,
                    "black": black_info,
                    "white": white_info,
                    "result": result
                })
            browser.close()
        names=[n.strip().lower() for n in players.split(',') if n.strip()]
        if names:
            pairings=[
                p for p in pairings
                if p['black'].lower() in names or p['white'].lower() in names
            ]
        
        return {
            "statusCode": 200,
            "headers": {
                "Cache-Control": "s-maxage=60, stale-while-revalidate",
                "Content-Type": "application/json"
            },
            "body": json.dumps({"pairings": pairings})
        }
    except Exception as e:
        return {
            "statusCode":500,
            "body":json.dumps({"error":str(e)})
        }