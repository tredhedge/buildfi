#!/usr/bin/env python3
"""
BuildFi — Guide 101 EN: Your Financial Basics
English translation — 1:1 port from French v8.
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch, mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    Flowable, KeepTogether, Frame, PageTemplate, BaseDocTemplate,
    NextPageTemplate
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect, Line, String, Circle, Polygon
from reportlab.graphics import renderPDF
import os

# ═══ FONTS ═══
pdfmetrics.registerFont(TTFont('Body', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('BodyBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Display', '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'))
pdfmetrics.registerFont(TTFont('DisplayBold', '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DisplayItalic', '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf'))
pdfmetrics.registerFont(TTFont('Mono', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))

# ═══ COLORS ═══
MARINE     = HexColor('#1a2744')
GOLD       = HexColor('#b8860b')
GOLD_LIGHT = HexColor('#d4a843')
CREAM      = HexColor('#faf8f4')
SAND       = HexColor('#e8e4db')
SAND_LIGHT = HexColor('#f2efe9')
FOREST     = HexColor('#1a7a4c')
FOREST_BG  = HexColor('#eef7f1')
BRICK      = HexColor('#b91c1c')
BRICK_BG   = HexColor('#fdf2f2')
MARINE_BG  = HexColor('#f0f2f6')
GOLD_BG    = HexColor('#fdf8ef')
TEXT_DARK   = HexColor('#2d2d2d')
TEXT_MED    = HexColor('#555555')
TEXT_LIGHT  = HexColor('#888888')
QC_BLUE     = HexColor('#003DA5')

W, H = letter
ML, MR, MT, MB = 60, 60, 60, 55
CW = W - ML - MR  # content width ~492

# ═══ STYLES ═══
S = {}
S['ch_title'] = ParagraphStyle('ChT', fontName='DisplayBold', fontSize=21, textColor=MARINE, leading=26, spaceAfter=6)
S['ch_sub'] = ParagraphStyle('ChS', fontName='DisplayItalic', fontSize=11, textColor=TEXT_MED, leading=14, spaceAfter=16)
S['h2'] = ParagraphStyle('H2', fontName='BodyBold', fontSize=12.5, textColor=MARINE, leading=17, spaceBefore=18, spaceAfter=8)
S['h3'] = ParagraphStyle('H3', fontName='BodyBold', fontSize=10.5, textColor=GOLD, leading=14, spaceBefore=14, spaceAfter=6)
S['body'] = ParagraphStyle('B', fontName='Body', fontSize=9.5, textColor=TEXT_DARK, leading=14.5, spaceAfter=8, alignment=TA_JUSTIFY)
S['body_intro'] = ParagraphStyle('BI', fontName='Body', fontSize=10, textColor=TEXT_MED, leading=15, spaceAfter=12)
S['box_body'] = ParagraphStyle('BB', fontName='Body', fontSize=9, textColor=TEXT_DARK, leading=13.5, spaceAfter=3)
S['box_title'] = ParagraphStyle('BT', fontName='BodyBold', fontSize=9, leading=12, spaceAfter=4)
S['pullquote'] = ParagraphStyle('PQ', fontName='DisplayItalic', fontSize=12.5, textColor=MARINE, leading=18, spaceBefore=16, spaceAfter=16, alignment=TA_CENTER, leftIndent=25, rightIndent=25)
S['toc_item'] = ParagraphStyle('TOC', fontName='Body', fontSize=9.5, textColor=MARINE, leading=18)
S['disclaimer'] = ParagraphStyle('Disc', fontName='Body', fontSize=7, textColor=TEXT_LIGHT, leading=9.5, alignment=TA_JUSTIFY)

# ═══ CUSTOM FLOWABLES ═══

class GoldRule(Flowable):
    def __init__(self, width=100, thickness=1.5):
        Flowable.__init__(self)
        self.width = width
        self.height = thickness + 6
        self._t = thickness
    def draw(self):
        self.canv.setStrokeColor(GOLD_LIGHT)
        self.canv.setLineWidth(self._t)
        x = (CW - self.width) / 2
        self.canv.line(x, self.height/2, x + self.width, self.height/2)

class InfoBox(Flowable):
    BOX_CFG = {
        'dollars':   (GOLD_BG,   GOLD,   GOLD),
        'didyouknow':(MARINE_BG, MARINE, MARINE),
        'caution':   (BRICK_BG,  BRICK,  BRICK),
        'goodtoknow':(FOREST_BG, FOREST, FOREST),
        'quebec':    (MARINE_BG, QC_BLUE,QC_BLUE),
        'brief':     (SAND_LIGHT,GOLD,   GOLD),
    }
    LABELS = {
        'dollars': 'IN DOLLARS', 'didyouknow': 'DID YOU KNOW?',
        'caution': 'CAUTION', 'goodtoknow': 'GOOD TO KNOW',
        'quebec': 'QUEBEC', 'brief': 'IN BRIEF',
    }

    def __init__(self, box_type, title, content_paras, width=None):
        Flowable.__init__(self)
        self.box_type = box_type
        self.title_text = title
        self.content_paras = content_paras
        self._width = width or CW
        self._calc()

    def _cfg(self):
        return self.BOX_CFG.get(self.box_type, self.BOX_CFG['didyouknow'])

    def _calc(self):
        bg, accent, tc = self._cfg()
        ts = ParagraphStyle('_bt', parent=S['box_title'], textColor=tc)
        pad = 12
        h = pad
        from reportlab.platypus.paragraph import Paragraph as P
        t = P(self.title_text, ts)
        _, th = t.wrap(self._width - 2*pad - 16, 1000)
        h += th + 3
        for txt in self.content_paras:
            p = P(txt, S['box_body'])
            _, ph = p.wrap(self._width - 2*pad - 8, 1000)
            h += ph + 2
        h += pad
        self.height = h
        self._ts = ts

    def wrap(self, aw, ah):
        self._width = min(self._width, aw)
        self._calc()
        return (self._width, self.height)

    def draw(self):
        bg, accent, tc = self._cfg()
        c = self.canv
        pad, bar = 12, 3.5
        r = 5
        c.setFillColor(bg); c.setStrokeColor(bg)
        c.roundRect(0, 0, self._width, self.height, r, fill=1, stroke=0)
        c.setFillColor(accent)
        c.rect(0, r, bar, self.height - 2*r, fill=1, stroke=0)
        c.rect(0, 0, bar+r, r, fill=1, stroke=0)
        c.rect(0, self.height-r, bar+r, r, fill=1, stroke=0)
        c.setFillColor(bg)
        c.circle(r, r, r, fill=1, stroke=0)
        c.circle(r, self.height-r, r, fill=1, stroke=0)
        c.setFillColor(accent)
        c.rect(0, r, bar, self.height-2*r, fill=1, stroke=0)

        from reportlab.platypus.paragraph import Paragraph as P
        y = self.height - pad
        t = P(self.title_text, self._ts)
        _, th = t.wrap(self._width - 2*pad - 8, 1000)
        y -= th; t.drawOn(c, pad+8, y); y -= 4
        for txt in self.content_paras:
            p = P(txt, S['box_body'])
            _, ph = p.wrap(self._width - 2*pad - 8, 1000)
            y -= ph; p.drawOn(c, pad+8, y); y -= 1


class ChapterHeader(Flowable):
    def __init__(self, num, title, subtitle=None):
        Flowable.__init__(self)
        self.num = str(num); self.title = title; self.sub = subtitle
        self.height = 66 if subtitle else 50
    def wrap(self, aw, ah): return (aw, self.height)
    def draw(self):
        c = self.canv
        c.setFont('DisplayBold', 48); c.setFillColor(HexColor('#e5e0d8'))
        c.drawString(0, self.height - 44, self.num)
        from reportlab.platypus.paragraph import Paragraph as P
        ox = 36 if len(self.num)==1 else 50
        t = P(self.title, S['ch_title']); _, th = t.wrap(CW-ox, 100)
        t.drawOn(c, ox, self.height - 26)
        if self.sub:
            s = P(self.sub, S['ch_sub']); s.wrap(CW-ox, 100)
            s.drawOn(c, ox, self.height - 26 - th - 1)


class PullQuote(Flowable):
    def __init__(self, text):
        Flowable.__init__(self)
        self.text = text
        self.height = 50
    def wrap(self, aw, ah):
        from reportlab.platypus.paragraph import Paragraph as P
        p = P(f'<i>\u201c{self.text}\u201d</i>', S['pullquote'])
        _, h = p.wrap(aw - 60, 1000)
        self.height = h + 24
        self._p = p
        self._aw = aw
        return (aw, self.height)
    def draw(self):
        c = self.canv
        c.setStrokeColor(GOLD_LIGHT); c.setLineWidth(1)
        mid = self._aw / 2
        c.line(mid-50, self.height-4, mid+50, self.height-4)
        self._p.drawOn(c, 30, 10)
        c.line(mid-50, 6, mid+50, 6)


# ═══ GRAPHIC BUILDERS ═══

def make_budget_chart():
    """50/30/20 horizontal stacked bar"""
    d = Drawing(CW, 60)
    bar_y, bar_h = 20, 28
    w_need = CW * 0.50; w_want = CW * 0.30; w_future = CW * 0.20
    d.add(Rect(0, bar_y, w_need, bar_h, fillColor=MARINE, strokeColor=None))
    d.add(Rect(w_need, bar_y, w_want, bar_h, fillColor=GOLD, strokeColor=None))
    d.add(Rect(w_need+w_want, bar_y, w_future, bar_h, fillColor=FOREST, strokeColor=None))
    d.add(String(w_need/2, bar_y+9, "Needs \u2014 50%", fontSize=9, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    d.add(String(w_need+w_want/2, bar_y+9, "Wants \u2014 30%", fontSize=9, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    d.add(String(w_need+w_want+w_future/2, bar_y+9, "Future \u2014 20%", fontSize=8, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    d.add(String(w_need/2, 4, "$2,100", fontSize=8, fontName='Mono', fillColor=MARINE, textAnchor='middle'))
    d.add(String(w_need+w_want/2, 4, "$1,260", fontSize=8, fontName='Mono', fillColor=GOLD, textAnchor='middle'))
    d.add(String(w_need+w_want+w_future/2, 4, "$840", fontSize=8, fontName='Mono', fillColor=FOREST, textAnchor='middle'))
    return d

def make_debt_comparison():
    """Min payment vs fixed payment comparison - horizontal bars"""
    d = Drawing(CW, 80)
    lw = 140
    bw = CW - lw - 10
    y1 = 48
    d.add(String(0, y1+4, "Minimum payment", fontSize=8.5, fontName='BodyBold', fillColor=BRICK))
    bar1_w = bw
    d.add(Rect(lw, y1, bar1_w, 18, fillColor=BRICK_BG, strokeColor=BRICK, strokeWidth=0.5))
    d.add(String(lw+bar1_w/2, y1+4, "30+ years  \u2022  $12,000 in interest", fontSize=8, fontName='Body', fillColor=BRICK, textAnchor='middle'))
    y2 = 16
    d.add(String(0, y2+4, "$200/mo (fixed)", fontSize=8.5, fontName='BodyBold', fillColor=FOREST))
    bar2_w = bw * (2.67/30)
    d.add(Rect(lw, y2, bar2_w, 18, fillColor=FOREST_BG, strokeColor=FOREST, strokeWidth=0.5))
    d.add(String(lw+bar2_w+8, y2+4, "2 years 8 months  \u2022  $1,500 in interest", fontSize=8, fontName='Body', fillColor=FOREST))
    d.add(String(CW/2, 74, "$5,000 in debt at 19.99%", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))
    return d

def make_credit_scale():
    """Visual credit score scale"""
    d = Drawing(CW, 55)
    bar_y, bar_h = 22, 16
    segs = [
        (300, 600, BRICK, "Poor"),
        (600, 650, HexColor('#e8a040'), "Fair"),
        (650, 700, GOLD, "Good"),
        (700, 760, FOREST, "Very Good"),
        (760, 900, HexColor('#0e6930'), "Excellent"),
    ]
    total = 900 - 300
    for lo, hi, col, label in segs:
        x = (lo - 300) / total * CW
        w = (hi - lo) / total * CW
        d.add(Rect(x, bar_y, w, bar_h, fillColor=col, strokeColor=None))
        d.add(String(x + w/2, bar_y + 3, label, fontSize=7, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    for val in [300, 600, 650, 700, 760, 900]:
        x = (val - 300) / total * CW
        d.add(String(x, 10, str(val), fontSize=7, fontName='Mono', fillColor=TEXT_MED, textAnchor='middle'))
    d.add(String(CW/2, 46, "Canadian Credit Score (Equifax / TransUnion)", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))
    return d

def make_rrq_chart():
    """QPP/CPP at 60 vs 65 vs 70 - horizontal bars"""
    d = Drawing(CW, 85)
    lw = 70
    max_val = 1420
    bw = CW - lw - 60
    items = [
        ("Age 70", 1420, FOREST),
        ("Age 65", 1000, GOLD),
        ("Age 60", 640, BRICK),
    ]
    for i, (label, val, col) in enumerate(items):
        y = 8 + i * 25
        d.add(String(0, y+5, label, fontSize=9, fontName='BodyBold', fillColor=col))
        bar_w = val / max_val * bw
        d.add(Rect(lw, y, bar_w, 18, fillColor=col, strokeColor=None, rx=3, ry=3))
        d.add(String(lw + bar_w + 6, y+4, f"${val:,}/mo".replace(",", ","), fontSize=8.5, fontName='Mono', fillColor=col))
    d.add(String(CW/2, 80, "Estimated monthly pension by starting age", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))
    return d

def make_cascade_flowchart():
    """Savings cascade as a vertical flow with arrows"""
    d = Drawing(CW, 225)
    box_w, box_h = 320, 22
    x0 = (CW - box_w) / 2
    steps = [
        ("1. Emergency fund (3 months)", MARINE),
        ("2. Employer RRSP match", FOREST),
        ("3. Debt above 7% interest", BRICK),
        ("4. FHSA (if first home)", GOLD),
        ("5. TFSA", GOLD),
        ("6. RRSP", GOLD),
        ("7. Non-registered account", TEXT_MED),
    ]
    y_start = 193
    for i, (label, col) in enumerate(steps):
        y = y_start - i * 28
        d.add(Rect(x0, y, box_w, box_h, fillColor=col, strokeColor=None, rx=4, ry=4))
        d.add(String(x0 + box_w/2, y+6, label, fontSize=9, fontName='BodyBold', fillColor=white, textAnchor='middle'))
        if i < len(steps) - 1:
            ax = x0 + box_w/2
            ay = y - 1
            d.add(Line(ax, ay, ax, ay-4, strokeColor=GOLD_LIGHT, strokeWidth=1.5))
            d.add(Polygon([ax-4, ay-4, ax+4, ay-4, ax, ay-8], fillColor=GOLD_LIGHT, strokeColor=None))
    d.add(String(CW/2, 218, "The savings cascade \u2014 priority order", fontSize=8.5, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))
    return d


# ═══ NEW GRAPHICS v8 ═══

def make_compound_interest_chart():
    """Exponential growth of 10K invested at different ages"""
    d = Drawing(CW, 130)
    d.add(String(CW/2, 122, "$10,000 invested once \u2014 7%/year return", fontSize=8.5, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))

    lw = 100
    bw = CW - lw - 50
    max_val = 149745

    scenarios = [
        ("At 25 (40 years)", 10000 * (1.07**40), 40, FOREST),
        ("At 35 (30 years)", 10000 * (1.07**30), 30, GOLD),
        ("At 45 (20 years)", 10000 * (1.07**20), 20, BRICK),
    ]

    for i, (label, final_val, years, col) in enumerate(scenarios):
        y = 88 - i * 32
        d.add(String(0, y+5, label, fontSize=8, fontName='BodyBold', fillColor=col))
        w = final_val / max_val * bw
        d.add(Rect(lw, y, w, 22, fillColor=col, strokeColor=None))
        w_init = 10000 / max_val * bw
        d.add(Rect(lw, y, w_init, 22, fillColor=None, strokeColor=white, strokeWidth=1))
        val_str = f"${final_val:,.0f}"
        d.add(String(lw + w + 6, y+5, val_str, fontSize=9, fontName='BodyBold', fillColor=col))

    d.add(String(lw, 8, "$10,000 initial", fontSize=7, fontName='Body', fillColor=TEXT_MED))
    d.add(Line(lw+72, 12, lw+90, 12, strokeColor=white, strokeWidth=1.5))
    d.add(String(lw+95, 8, "= initial amount", fontSize=7, fontName='Body', fillColor=TEXT_LIGHT))

    return d


def make_rrsp_vs_tfsa_chart():
    """RRSP vs TFSA: who wins based on marginal rate change"""
    d = Drawing(CW, 110)
    d.add(String(CW/2, 102, "RRSP vs TFSA \u2014 Who wins?", fontSize=8.5, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))

    lw = 155
    bw = CW - lw - 10

    scenarios = [
        ("Rate drops at retirement", "RRSP wins", 0.72, MARINE, "E.g. 45% \u2192 30%"),
        ("Rate stays the same", "Tie", 0.50, GOLD, "E.g. 35% \u2192 35%"),
        ("Rate rises at retirement", "TFSA wins", 0.28, FOREST, "E.g. 30% \u2192 45%"),
    ]

    for i, (label, winner, rrsp_frac, col, example) in enumerate(scenarios):
        y = 72 - i * 28
        d.add(String(0, y+8, label, fontSize=8, fontName='BodyBold', fillColor=TEXT_DARK))
        d.add(String(0, y-2, example, fontSize=7, fontName='Body', fillColor=TEXT_MED))

        rrsp_w = rrsp_frac * bw
        tfsa_w = (1 - rrsp_frac) * bw
        d.add(Rect(lw, y, rrsp_w, 20, fillColor=MARINE, strokeColor=None))
        if rrsp_w > 30:
            d.add(String(lw + rrsp_w/2, y+5, "RRSP", fontSize=7.5, fontName='BodyBold', fillColor=white, textAnchor='middle'))
        d.add(Rect(lw + rrsp_w, y, tfsa_w, 20, fillColor=FOREST, strokeColor=None))
        if tfsa_w > 30:
            d.add(String(lw + rrsp_w + tfsa_w/2, y+5, "TFSA", fontSize=7.5, fontName='BodyBold', fillColor=white, textAnchor='middle'))

        d.add(String(lw + bw + 6, y+5, winner, fontSize=7.5, fontName='BodyBold', fillColor=col))

    return d


def make_avalanche_vs_snowball():
    """Avalanche vs snowball debt repayment comparison"""
    d = Drawing(CW, 95)
    d.add(String(CW/2, 88, "3 debts (card 19.99%, car 6.5%, LOC 9%) \u2014 Repaid over 3 years", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))

    lw = 130
    bw = CW - lw - 80
    max_int = 4800

    items = [
        ("Avalanche", "(highest rate first)", 3200, FOREST, "Costs less"),
        ("Snowball", "(smallest balance first)", 4100, GOLD, "Quick wins"),
        ("Minimum payment", "(no strategy)", 4800, BRICK, "Most expensive"),
    ]

    for i, (label, sub, interest, col, note) in enumerate(items):
        y = 60 - i * 24
        d.add(String(0, y+8, label, fontSize=8, fontName='BodyBold', fillColor=col))
        d.add(String(0, y-2, sub, fontSize=6.5, fontName='Body', fillColor=TEXT_MED))

        w = interest / max_int * bw
        d.add(Rect(lw, y, w, 18, fillColor=col, strokeColor=None))
        val_str = f"${interest:,} in interest"
        d.add(String(lw + w + 6, y+3, val_str, fontSize=8, fontName='BodyBold', fillColor=col))
        d.add(String(lw + w + 6 + len(val_str)*5 + 20, y+3, note, fontSize=7, fontName='Body', fillColor=TEXT_MED))

    return d


# ═══ TABLE BUILDERS ═══

def make_accounts_table():
    """Comparison table: RRSP vs TFSA vs FHSA"""
    header_style = ParagraphStyle('TH', fontName='BodyBold', fontSize=8, textColor=white, leading=10, alignment=TA_CENTER)
    cell_style = ParagraphStyle('TC', fontName='Body', fontSize=8, textColor=TEXT_DARK, leading=11)
    cell_bold = ParagraphStyle('TCB', fontName='BodyBold', fontSize=8, textColor=MARINE, leading=11, alignment=TA_CENTER)

    data = [
        [Paragraph('', header_style), Paragraph('RRSP', header_style), Paragraph('TFSA', header_style), Paragraph('FHSA', header_style)],
        [Paragraph('<b>Contribution deductible?</b>', cell_style), Paragraph('Yes', cell_bold), Paragraph('No', cell_bold), Paragraph('Yes', cell_bold)],
        [Paragraph('<b>Withdrawals taxable?</b>', cell_style), Paragraph('Yes', cell_bold), Paragraph('No', cell_bold), Paragraph('No*', cell_bold)],
        [Paragraph('<b>Annual max 2026</b>', cell_style), Paragraph('$33,810', cell_bold), Paragraph('$7,000', cell_bold), Paragraph('$8,000', cell_bold)],
        [Paragraph('<b>Cumulative room</b>', cell_style), Paragraph('Varies', cell_bold), Paragraph('$109,000', cell_bold), Paragraph('$40,000', cell_bold)],
        [Paragraph('<b>Age limit</b>', cell_style), Paragraph('71', cell_bold), Paragraph('None', cell_bold), Paragraph('71 / 15 yrs', cell_bold)],
        [Paragraph('<b>Affects OAS/GIS?</b>', cell_style), Paragraph('Yes (withdrawal)', cell_bold), Paragraph('No', cell_bold), Paragraph('No*', cell_bold)],
        [Paragraph('<b>Ideal for</b>', cell_style), Paragraph('High income now\n\u2192 lower at retirement', cell_style), Paragraph('Flexibility\ntax-free', cell_style), Paragraph('First home', cell_style)],
    ]

    col_w = [CW*0.26, CW*0.24, CW*0.24, CW*0.26]
    t = Table(data, colWidths=col_w, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), MARINE),
        ('BACKGROUND', (0,1), (0,-1), SAND_LIGHT),
        ('BACKGROUND', (1,1), (-1,-1), white),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('ALIGN', (1,1), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, SAND),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('BACKGROUND', (1,2), (-1,2), HexColor('#f8f6f2')),
        ('BACKGROUND', (1,4), (-1,4), HexColor('#f8f6f2')),
        ('BACKGROUND', (1,6), (-1,6), HexColor('#f8f6f2')),
    ]))
    return t


# ═══ PAGE TEMPLATES ═══

def page_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    canvas.setStrokeColor(SAND); canvas.setLineWidth(0.5)
    canvas.line(ML, MB-10, W-MR, MB-10)
    canvas.setFont('Body', 7.5); canvas.setFillColor(TEXT_LIGHT)
    canvas.drawString(ML, MB-22, "buildfi.ca")
    canvas.drawRightString(W-MR, MB-22, f"Your Financial Basics \u2014 p.\u2009{doc.page}")
    canvas.setStrokeColor(GOLD_LIGHT); canvas.setLineWidth(1.5)
    canvas.line(ML, H-32, W-MR, H-32)
    canvas.restoreState()

def cover_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(CREAM); canvas.rect(0, 0, W, H, fill=1, stroke=0)
    canvas.setFillColor(GOLD); canvas.rect(0, H-8, W, 8, fill=1, stroke=0)
    canvas.setFillColor(MARINE); canvas.rect(0, H-270, W, 262, fill=1, stroke=0)
    canvas.setFont('DisplayBold', 130); canvas.setFillColor(HexColor('#243558'))
    canvas.drawString(W-270, H-240, "101")
    canvas.setFont('DisplayBold', 13); canvas.setFillColor(GOLD_LIGHT)
    canvas.drawString(ML+10, H-65, "BuildFi")
    canvas.setFont('DisplayBold', 30); canvas.setFillColor(white)
    canvas.drawString(ML+10, H-130, "Your Financial")
    canvas.drawString(ML+10, H-165, "Basics")
    canvas.setFont('Body', 11); canvas.setFillColor(HexColor('#a0b0cc'))
    canvas.drawString(ML+10, H-198, "What every Canadian should know")
    canvas.setFont('Body', 11)
    canvas.drawString(ML+10, H-214, "\u2014 in plain language.")
    canvas.setFillColor(GOLD); canvas.rect(0, H-273, W, 3, fill=1, stroke=0)
    canvas.setFont('DisplayItalic', 13); canvas.setFillColor(MARINE)
    canvas.drawString(ML+10, H-320, "Budget. Debt. Savings. Retirement.")
    canvas.drawString(ML+10, H-340, "In the right order.")
    canvas.setFont('Body', 9.5); canvas.setFillColor(TEXT_MED)
    y = H - 385
    for line in [
        "This guide gives you the tools to decide for yourself.",
        "No jargon. No hidden sales pitch. Just what you",
        "need to know, with real dollar examples.",
    ]:
        canvas.drawString(ML+10, y, line); y -= 15

    # Key highlights section
    y -= 20
    canvas.setStrokeColor(GOLD_LIGHT); canvas.setLineWidth(0.5)
    canvas.line(ML+10, y, ML+150, y)
    y -= 18

    highlights = [
        ("Budget", "The 50/30/20 method in 3 minutes"),
        ("Debt", "Why paying it off comes before saving"),
        ("Savings", "The exact order: emergency \u2192 TFSA \u2192 RRSP"),
        ("Accounts", "RRSP vs TFSA vs FHSA \u2014 in one table"),
        ("Retirement", "CPP, OAS, GIS \u2014 what you\u2019ll actually get"),
    ]
    for title, desc in highlights:
        canvas.setFont('BodyBold', 8); canvas.setFillColor(GOLD)
        canvas.drawString(ML+10, y, title)
        canvas.setFont('Body', 8); canvas.setFillColor(TEXT_MED)
        canvas.drawString(ML+75, y, desc)
        y -= 14
    canvas.setFont('Body', 8.5); canvas.setFillColor(TEXT_LIGHT)
    canvas.drawString(ML+10, 72, "Included with your BuildFi Essential Report")
    canvas.setFont('Body', 7.5)
    canvas.drawString(ML+10, 58, "Up-to-date figures \u2014 2026 Tax Year  \u2022  Adapted for Quebec and Canada")
    canvas.setFillColor(GOLD); canvas.rect(0, 0, W, 4, fill=1, stroke=0)
    canvas.restoreState()

# ═══ BUILD DOCUMENT ═══

def build():
    path = "/home/claude/guide-101-your-financial-basics.pdf"
    doc = BaseDocTemplate(path, pagesize=letter,
        leftMargin=ML, rightMargin=MR, topMargin=MT, bottomMargin=MB,
        title="BuildFi \u2014 Your Financial Basics (101)",
        author="BuildFi")

    f_content = Frame(ML, MB, CW, H-MT-MB, id='content')
    f_cover = Frame(ML, MB, CW, H-MT-MB, id='cover')
    doc.addPageTemplates([
        PageTemplate(id='Cover', frames=[f_cover], onPage=cover_page),
        PageTemplate(id='Content', frames=[f_content], onPage=page_bg),
    ])

    story = []
    story.append(NextPageTemplate('Content'))
    story.append(PageBreak())

    # ──── TABLE OF CONTENTS ────
    story.append(Spacer(1, 6))
    story.append(Paragraph("In this guide", S['ch_title']))
    story.append(GoldRule(70, 1.5))
    story.append(Spacer(1, 10))
    for num, title, sub in [
        ("1","Your financial portrait","Knowing where you stand"),
        ("2","The budget","Your game plan"),
        ("3","Debt","The wall before savings"),
        ("4","Credit","The invisible score"),
        ("5","Savings","The cascade for your dollars"),
        ("6","Your accounts explained","RRSP, TFSA, FHSA \u2014 no jargon"),
        ("7","The government and you","CPP, OAS, GIS \u2014 what you\u2019ll get"),
        ("8","Protecting your plan","The insurance you can\u2019t ignore"),
        ("9","Your next step","5 concrete actions"),
    ]:
        story.append(Paragraph(
            f'<font name="DisplayBold" color="#b8860b" size="12">{num}</font>'
            f'&nbsp;&nbsp;<font name="BodyBold" size="9.5" color="#1a2744">{title}</font>'
            f'&nbsp;&nbsp;<font name="Body" size="8" color="#888888">\u2014 {sub}</font>', S['toc_item']))
    story.append(Spacer(1, 16))
    story.append(InfoBox('didyouknow', 'WHERE TO START?', [
        '<font name="BodyBold">High-interest debt?</font> \u2192 Chapter 3. '
        '<font name="BodyBold">Already saving?</font> \u2192 Chapter 5. '
        '<font name="BodyBold">Close to retirement?</font> \u2192 Chapters 6\u20137. '
        '<font name="BodyBold">Starting from scratch?</font> \u2192 Read in order.',
    ]))

    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "<font name='Body' size='8' color='#888888'>"
        "This guide is provided for informational and educational purposes only. It does not constitute personalized financial, "
        "tax, legal, or investment advice. The strategies and examples presented are general in nature "
        "and may not be suitable for your situation. Consult a certified professional before making any decision."
        "</font>", S['body']))
    story.append(Spacer(1, 16))

    # ═══ CH 1 — PORTRAIT ═══
    story.append(KeepTogether([
        ChapterHeader("1", "Your financial portrait", "Knowing where you stand \u2014 in 5 minutes"),
        GoldRule(50, 1.5), Spacer(1, 10),
        Paragraph(
            "Before talking about budgets or retirement, one question: <font name='BodyBold'>where do you stand today?</font> "
            "Not in terms of salary \u2014 in terms of net worth. Everything you own, minus everything you owe. "
            "It\u2019s the only number that measures your true financial health.", S['body_intro']),
    ]))
    story.append(InfoBox('dollars', 'IN DOLLARS \u2014 A concrete example', [
        '<font name="BodyBold">Assets:</font> Bank account $3,200 + TFSA $12,000 + RRSP $28,000 + Home $385,000 = <font name="BodyBold">$428,200</font>',
        '<font name="BodyBold">Liabilities:</font> Mortgage $295,000 + Credit card $4,800 + Car loan $18,000 = <font name="BodyBold">$317,800</font>',
        '<font name="BodyBold">Net worth: $110,400</font> \u2014 That\u2019s your starting point. The goal: move that number up, month after month.',
    ]))
    story.append(Spacer(1, 10))
    story.append(InfoBox('goodtoknow', 'GOOD TO KNOW', [
        'A negative net worth early in your career (student loans, recent mortgage) is normal. What matters is the <font name="BodyBold">trend</font>: is it going up every year?',
    ]))

    # ═══ CH 2 — BUDGET ═══
    story.append(Spacer(1, 24))
    story.append(ChapterHeader("2", "The budget \u2014 your game plan", "Not a punishment. A freedom tool."))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "The word \u201cbudget\u201d doesn\u2019t excite anyone. But a budget isn\u2019t a list of restrictions \u2014 "
        "it\u2019s a plan that lets you <font name='BodyBold'>consciously choose</font> where your money goes. "
        "The simplest method: split your net income into three categories.", S['body_intro']))

    story.append(Paragraph("Needs / Wants / Future", S['h2']))
    story.append(make_budget_chart())
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "<font name='Body' size='8.5' color='#555555'>"
        "Example based on $4,200/month net income. If you can\u2019t hit 20% for Future, start at 10%. Even 5%.</font>",
        ParagraphStyle('sm', fontName='Body', fontSize=8.5, textColor=TEXT_MED, leading=12, alignment=TA_CENTER, spaceAfter=8)))

    story.append(Paragraph(
        "<font name='BodyBold'>Needs (50%)</font> \u2014 housing, groceries, transportation, insurance, minimum payments. "
        "<font name='BodyBold'>Wants (30%)</font> \u2014 restaurants, entertainment, subscriptions, hobbies. "
        "<font name='BodyBold'>Future (20%)</font> \u2014 accelerated debt repayment, savings, investments. "
        "This is the category most people \u201cforget\u201d \u2014 and it\u2019s the one that builds your freedom.", S['body']))

    story.append(InfoBox('caution', 'CAUTION \u2014 The silent leak', [
        'The average Canadian pays $100 to $200/month in recurring subscriptions (streaming, gym, apps, cloud). '
        'That\u2019s $1,200 to $2,400/year \u2014 the equivalent of a vacation or a year of TFSA contributions.',
        '<font name="BodyBold">Exercise:</font> Open your last 3 statements. Highlight every recurring payment. Add them up. Multiply by 12.',
    ]))
    story.append(Spacer(1, 10))
    story.append(InfoBox('didyouknow', 'DID YOU KNOW? \u2014 The cost in work hours', [
        'At $25/hr net: a $6 coffee = <font name="BodyBold">15 minutes of work</font>. '
        'A $150 dinner = <font name="BodyBold">6 hours</font>. '
        'A $45,000 new car = <font name="BodyBold">1,800 hours \u2014 almost a full year</font>. '
        'This isn\u2019t about guilt. It\u2019s about deciding with full awareness.',
    ]))
    story.append(Spacer(1, 10))
    story.append(InfoBox('brief', 'IN BRIEF', [
        '\u2022 <font name="BodyBold">50/30/20</font> \u2014 Needs, Wants, Future. Simple and effective.',
        '\u2022 Audit your subscriptions \u2014 $100 to $200/month hiding in plain sight.',
        '\u2022 <font name="BodyBold">Automate</font> \u2014 pay your savings like your rent, on the 1st of the month.',
    ]))

    # ═══ CH 3 — DEBT ═══
    story.append(Spacer(1, 24))
    story.append(ChapterHeader("3", "Debt \u2014 the wall before savings", "Every dollar on your card costs double"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "There\u2019s no point talking about retirement savings if you\u2019re paying 19.99% interest on a credit card. "
        "Paying off a 20% debt is like getting a guaranteed 20% return \u2014 "
        "hard to beat that on the markets.", S['body_intro']))

    story.append(Paragraph("The minimum payment trap", S['h2']))
    story.append(make_debt_comparison())
    story.append(Spacer(1, 6))

    story.append(Paragraph("Two repayment strategies", S['h2']))
    story.append(Paragraph(
        "<font name='BodyBold'>Avalanche</font> \u2014 pay the minimum everywhere, then throw every extra dollar "
        "at the debt with the highest rate. This minimizes total interest paid. "
        "<font name='BodyBold'>Snowball</font> \u2014 same principle, but target the smallest balance first. "
        "Quick wins create powerful psychological momentum.", S['body']))

    story.append(make_avalanche_vs_snowball())
    story.append(Spacer(1, 6))

    story.append(InfoBox('goodtoknow', 'GOOD TO KNOW \u2014 The 7% rule', [
        'As a general rule, it may be advantageous to pay off any debt above 7% <font name="BodyBold">before</font> saving for retirement. Why? 7% is roughly the historical average market return. By eliminating a 20% debt, you get the equivalent of a 20% return with zero market risk. Every situation is different \u2014 taxes, risk tolerance, and liquidity also matter.',
        '<font name="BodyBold">Exception:</font> your employer\u2019s RRSP match \u2014 the money your employer adds when you contribute (an instant 50\u2013100% return). Contribute enough to get the full match, even if you have debt.',
    ]))
    story.append(Spacer(1, 10))
    story.append(InfoBox('brief', 'IN BRIEF', [
        '\u2022 As a general rule, debt above 7% should be paid off before saving for retirement',
        '\u2022 <font name="BodyBold">Avalanche</font> (highest rate first) = optimal in $  \u2022  <font name="BodyBold">Snowball</font> (smallest balance first) = optimal for motivation',
        '\u2022 The minimum payment is a trap \u2014 set a fixed amount and stick to it',
    ]))

    # ═══ CH 4 — CREDIT ═══
    story.append(ChapterHeader("4", "Credit \u2014 the invisible score", "The one that decides if you get that mortgage"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Your credit score (300\u2013900) summarizes your borrowing history. You never see it, "
        "but it affects your mortgage rate, your ability to rent, your insurance premiums, "
        "and sometimes your job prospects.", S['body_intro']))

    story.append(make_credit_scale())
    story.append(Spacer(1, 14))

    story.append(Paragraph("What makes your score go up (or down)", S['h2']))
    story.append(Paragraph(
        "<font name='BodyBold'>Payment history (~35%)</font> \u2014 Pay on time, always. A 30+ day late payment can "
        "cost 50 to 100 points and stay on your file for up to 6 years. "
        "<font name='BodyBold'>Credit utilization (~30%)</font> \u2014 Keep your balances under 30% of the limit. "
        "$10,000 card \u2192 keep the balance under $3,000. "
        "<font name='BodyBold'>Other factors (~35%)</font> \u2014 account age (don\u2019t close your oldest cards), "
        "credit mix, number of recent inquiries.", S['body']))

    story.append(InfoBox('goodtoknow', 'GOOD TO KNOW \u2014 Check for free', [
        'Equifax and TransUnion offer free annual access. Borrowell and Credit Karma too. '
        '<font name="BodyBold">Checking your own score does not affect it</font> \u2014 it\u2019s a \u201csoft\u201d inquiry.',
    ]))
    story.append(Spacer(1, 10))
    story.append(InfoBox('caution', 'CAUTION \u2014 Common myth', [
        '<font name="BodyBold">\u201cCarrying a balance improves your score.\u201d</font> False. You never need to pay interest to build credit. '
        'Pay your balance in full every month \u2014 that\u2019s the best strategy.',
    ]))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "<font name='BodyBold'>The dollar impact:</font> a score difference between 650 and 760 on a "
        "$400,000 mortgage can mean 0.5% higher rate \u2014 over $45,000 in extra interest "
        "over 25 years. Your score has a real price.", S['body']))

    # ═══ CH 5 — SAVINGS CASCADE ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("5", "Savings \u2014 the cascade for your dollars", "Every dollar has an optimal home"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "You have a monthly surplus. The question: <font name='BodyBold'>where should it go first?</font> "
        "Here\u2019s the logical order, from most urgent to least urgent.", S['body_intro']))

    story.append(make_cascade_flowchart())
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "<font name='BodyBold'>Step 1 \u2014 the emergency fund</font> is the foundation: 3 months of essential expenses in a "
        "readily accessible account (TFSA high-interest savings). This isn\u2019t an investment \u2014 "
        "it\u2019s a safety net that keeps you from falling back into 20% debt when an emergency hits.", S['body']))

    story.append(InfoBox('didyouknow', 'DID YOU KNOW?', [
        'Half of Canadians (51%) say they can\u2019t cover an unexpected $1,000 expense without borrowing (Angus Reid, 2022). The emergency fund is what separates stability from a downward spiral.',
    ]))
    story.append(Spacer(1, 4))

    story.append(InfoBox('dollars', 'IN DOLLARS \u2014 Where does each dollar go?', [
        '<font name="BodyBold">$300/month:</font> Cushion not full? \u2192 All into TFSA savings. Cushion OK + employer match? \u2192 $150 RRSP + $150 TFSA.',
        '<font name="BodyBold">$1,000/month:</font> Buying a home? \u2192 $667 FHSA + $333 TFSA. No home project? \u2192 $583 TFSA + $417 RRSP.',
    ]))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Time \u2014 your greatest ally", S['h2']))
    story.append(Paragraph(
        "Compound interest is the most powerful force in personal finance. "
        "Your money earns returns, and those returns earn returns of their own. "
        "The earlier you start, the more dramatic the effect.", S['body']))
    story.append(make_compound_interest_chart())
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "The person who starts at 25 ends up with <font name='BodyBold'>nearly double</font> "
        "compared to the person who starts at 35 \u2014 with exactly the same initial amount. "
        "The difference? 10 more years of compound growth. That\u2019s why the best time "
        "to start saving is now.", S['body']))

    story.append(Spacer(1, 16))

    # ═══ CH 6 — ACCOUNTS ═══
    story.append(ChapterHeader("6", "Your accounts explained", "RRSP, TFSA, FHSA \u2014 no jargon"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Each account has its own rules. This table summarizes the essentials at a glance.", S['body_intro']))

    story.append(make_accounts_table())
    story.append(Paragraph(
        "<font name='Body' size='7.5' color='#888888'>* FHSA withdrawals are tax-free only for the purchase of a qualifying first home.</font>",
        ParagraphStyle('fn', fontName='Body', fontSize=7.5, textColor=TEXT_LIGHT, leading=10, spaceBefore=3, spaceAfter=10)))

    story.append(Paragraph(
        "<font name='BodyBold'>RRSP</font> \u2014 Every dollar contributed reduces your tax this year. "
        "Your money grows tax-sheltered. But every dollar withdrawn is taxable. "
        "Can be advantageous if your current tax rate is higher than the one expected at retirement.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>TFSA</font> \u2014 No tax deduction going in, but everything that comes out is "
        "100% tax-free. Withdrawals don\u2019t count as income \u2014 they don\u2019t affect "
        "your OAS, your GIS, or your government benefits. Can hold the same investments as an RRSP.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>FHSA</font> \u2014 Combines the advantages of the RRSP and TFSA for a first home. "
        "Tax deduction like the RRSP + tax-free withdrawals like the TFSA. "
        "$8,000/year, $40,000 lifetime. It may be advantageous to open it even without contributing \u2014 contribution room accumulates.", S['body']))

    story.append(Paragraph("RRSP or TFSA first?", S['h2']))
    story.append(Paragraph(
        "This is the most common question. The answer depends on a single variable: "
        "your tax rate now vs. at retirement.", S['body']))
    story.append(make_rrsp_vs_tfsa_chart())
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "<font name='BodyBold'>In practice</font>: if you earn more than ~$55,000/year, "
        "the RRSP is generally advantageous. Below that, the TFSA is often preferable. "
        "When in doubt: the TFSA is often a good starting point \u2014 its flexibility (tax-free withdrawals, "
        "no impact on government benefits) makes it the most versatile account.", S['body']))

    story.append(InfoBox('caution', 'CAUTION \u2014 The oversized RRSP trap', [
        'A $2 million RRSP at age 71 = mandatory RRIF withdrawals of ~$106,000/year. This income can trigger OAS clawback and push you into a high tax bracket. Guide 201 covers strategies to avoid this trap.',
    ]))

    story.append(InfoBox('quebec', 'QUEBEC', [
        'You file <font name="BodyBold">two tax returns</font> (federal + provincial). Marginal rates among the highest in Canada \u2014 the RRSP is particularly advantageous for high earners there. Registered account rules are the same everywhere \u2014 it\u2019s the tax rates that vary.',
    ]))

    story.append(Spacer(1, 16))

    # ═══ CH 7 — GOVERNMENT ═══
    story.append(ChapterHeader("7", "The government and you", "What you\u2019ll receive \u2014 and when"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Canada\u2019s retirement system rests on three pillars: the government, your employer (if applicable), "
        "and you. Let\u2019s start with the first \u2014 the one everyone receives but few understand.", S['body_intro']))

    story.append(InfoBox('quebec', 'QUEBEC vs REST OF CANADA', [
        'In Quebec: <font name="BodyBold">Quebec Pension Plan (QPP)</font>. Elsewhere: <font name="BodyBold">Canada Pension Plan (CPP)</font>. The rules are similar, but amounts and calculations differ slightly. If you\u2019ve worked in both places, your contributions are consolidated.',
    ]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("QPP / CPP \u2014 The age you start changes everything", S['h2']))
    story.append(make_rrq_chart())
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "The maximum pension in 2026 at age 65 is $1,508/month. "
        "But the <font name='BodyBold'>actual average</font> for new retirees is about $900/month. "
        "The choice of 60/65/70 is permanent \u2014 it affects your income for the rest of your life.", S['body']))
    story.append(Paragraph(
        "Since 2019, the QPP/CPP has been gradually enhanced: workers who contribute after 2019 "
        "accumulate additional entitlements. Younger generations will receive more.", S['body']))

    story.append(Paragraph("OAS \u2014 Universal but clawable", S['h2']))
    story.append(Paragraph(
        "Paid to most Canadians starting at age 65 (40 years of residency for the full amount). "
        "Maximum Q1 2026: $742/month (age 65\u201374), $817/month (75+). "
        "OAS is indexed quarterly to inflation \u2014 your purchasing power is protected.", S['body']))
    story.append(InfoBox('caution', 'CAUTION \u2014 OAS clawback', [
        'Net income above <font name="BodyBold">$95,323</font> in 2026? The government claws back 15\u00a2 per dollar above that threshold. At ~$152,000, your OAS drops to zero. Over 20\u201325 years = potentially <font name="BodyBold">$100,000+ in lost benefits</font>. Guide 201 covers strategies to protect your OAS.',
    ]))
    story.append(Spacer(1, 10))

    story.append(Paragraph("GIS \u2014 The low-income bonus", S['h2']))
    story.append(Paragraph(
        "A non-taxable supplement for low-income retirees receiving OAS. "
        "Maximum Q1 2026 (single): $1,109/month. TFSA withdrawals don\u2019t affect it \u2014 "
        "RRSP withdrawals reduce it. This is a major reason to prioritize the TFSA if you expect "
        "a low income in retirement.", S['body']))

    story.append(InfoBox('brief', 'IN BRIEF \u2014 Government benefits', [
        '\u2022 <font name="BodyBold">QPP/CPP</font> \u2014 Based on your contributions. Choice of 60/65/70 = permanent. Max $1,508/mo. Average ~$900/mo.',
        '\u2022 <font name="BodyBold">OAS</font> \u2014 Universal at 65, $742/mo. Indexed to inflation. Clawed back if income > $95,323.',
        '\u2022 <font name="BodyBold">GIS</font> \u2014 Low income, up to $1,109/mo, non-taxable. The TFSA protects it.',
    ]))

    story.append(Spacer(1, 14))

    # ═══ CH 8 — INSURANCE ═══
    story.append(KeepTogether([
        ChapterHeader("8", "Protecting your plan", "The insurance you can\u2019t ignore"),
        GoldRule(50, 1.5), Spacer(1, 10),
        Paragraph(
            "A financial plan without protection is a house of cards. "
            "If your income disappeared tomorrow, everything collapses.", S['body_intro']),
        InfoBox('didyouknow', 'DID YOU KNOW?', [
            'One in three Canadians will be disabled for 90 days or more before age 65 (CLHIA). People insure their cars but not their ability to earn an income \u2014 which is by far their most valuable asset.',
        ]),
    ]))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "The order isn\u2019t random: the probability of becoming disabled before 65 is higher "
        "than that of premature death. Disability is the most underestimated risk.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>1. Disability insurance</font> \u2014 Replaces part of your income if you can no longer work. "
        "Check your employer coverage. If you\u2019re self-employed: this should be a top priority.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>2. Life insurance</font> \u2014 Essential if someone depends on your income (spouse, children). "
        "Simple term (10 or 20 years) = affordable and sufficient for most families. "
        "Example: 35-year-old non-smoking male, $500,000 coverage over 20 years = roughly $30\u2013$45/month.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>3. Critical illness</font> \u2014 Lump sum if diagnosed with a covered condition (cancer, stroke, heart attack). "
        "Covers non-medical expenses: mortgage, groceries, transportation during recovery.", S['body']))

    story.append(InfoBox('goodtoknow', 'GOOD TO KNOW \u2014 Check before you buy', [
        'Many Canadians are already covered by their employer without knowing it. Before buying individual insurance, check your group coverage \u2014 it could cover 60\u201370% of your salary in case of disability.',
    ]))

    # ═══ COSTLY MISTAKES ═══
    story.append(Spacer(1, 22))
    story.append(Paragraph(
        '<font name="DisplayBold" size="18" color="#b91c1c">The 5 most costly mistakes</font>', S['ch_title']))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "These mistakes are common, expensive, and avoidable. If you remember just one thing from this guide, "
        "make it this list.", S['body_intro']))

    erreurs = [
        ("1. Ignoring the employer match",
         "If your employer offers a 50% match on your RRSP contributions, not contributing means "
         "giving up an instant 50% return. It\u2019s one of the few financial advantages with zero market risk. "
         "It may be advantageous to contribute at least enough to get the full match \u2014 even if you have debt."),
        ("2. Paying only the minimum on credit cards",
         "On $5,000 at 19.99%, the minimum payment costs you $12,000 in interest and 30 years. "
         "A fixed $200/month: $1,500 in interest and 2 years 8 months. The difference is enormous."),
        ("3. Waiting for \u201cthe right time\u201d to invest",
         "The best time to invest was 20 years ago. The second best time is today. "
         "Timing the market bottom is impossible \u2014 even professionals can\u2019t do it. "
         "An automatic monthly transfer eliminates the decision."),
        ("4. Forgetting recurring subscriptions",
         "The average Canadian spends over $200/month on subscriptions (streaming, gym, apps, etc.). "
         "Go through your last 3 statements with a fine-tooth comb. Every $15/month eliminated = $180/year \u2192 "
         "invested for 30 years at 7% = $17,000."),
        ("5. Keeping a mutual fund at 2.2% fees",
         "Over 30 years, the difference between 0.25% (index ETF) and 2.20% (mutual fund) on $200,000 "
         "represents over $200,000. Your management fees are the most predictable factor "
         "in your long-term return \u2014 and the only one you fully control."),
    ]
    for title, desc in erreurs:
        story.append(Paragraph(
            f"<font name='BodyBold' color='#b91c1c'>{title}</font>", S['body']))
        story.append(Paragraph(desc, S['body']))
        story.append(Spacer(1, 4))

    # ═══ CH 9 — NEXT STEP ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("9", "Your next step", "5 concrete actions \u2014 this week"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "You have the basics. What matters now: take action. Not tomorrow. This week.", S['body_intro']))

    story.append(PullQuote("Nobody regrets starting too early. Everyone regrets waiting."))
    story.append(Spacer(1, 4))

    actions = [
        ("1", "Calculate your net worth.", "5 minutes. What you own \u2212 what you owe. Write the number down."),
        ("2", "Audit your subscriptions.", "Last 3 bank statements. Highlight every recurring payment. Decide what stays."),
        ("3", "Automate a transfer.", "Even $50/paycheque into a TFSA or FHSA. Money you don\u2019t see doesn\u2019t get spent."),
        ("4", "Check your employer benefits.", "RRSP match? Disability insurance? You might discover underused advantages."),
        ("5", "Check your credit score.", "Borrowell or Credit Karma, it\u2019s free. If it\u2019s below 700, chapters 3 and 4 are your priority."),
    ]
    for num, title, desc in actions:
        story.append(Paragraph(
            f"<font name='DisplayBold' color='#b8860b' size='13'>{num}</font>&nbsp;&nbsp;"
            f"<font name='BodyBold'>{title}</font> {desc}", S['body']))

    story.append(Spacer(1, 10))
    story.append(GoldRule(80, 1))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "This guide gave you the basics. Your BuildFi Report goes further:", S['body']))

    story.append(InfoBox('dollars', 'WHAT YOUR REPORT GIVES YOU', [
        '<font name="BodyBold">Readiness score</font> \u2014 A 0 to 100 score that summarizes your situation.',
        '<font name="BodyBold">Personalized observations</font> \u2014 What\u2019s going well. What needs attention. What you can do.',
        '<font name="BodyBold">Monte Carlo simulation</font> \u2014 5,000 market scenarios tested on your plan, not generic averages.',
    ]))

    story.append(Spacer(1, 16))

    # ═══ BUILDFI PRINCIPLES ═══
    story.append(InfoBox('goodtoknow', 'The 3 BuildFi principles', [
        '<font name="BodyBold">1. Safety before returns.</font> A solid emergency fund is worth more than a 12% return on a fragile portfolio.',
        '<font name="BodyBold">2. Liquidity before tax optimization.</font> Cash you can access in an emergency comes before the perfect tax strategy.',
        '<font name="BodyBold">3. Simplicity before sophistication.</font> A simple plan you follow beats a complex plan you abandon.',
    ]))

    story.append(Spacer(1, 14))
    story.append(GoldRule(CW - 60, 0.5))
    story.append(Spacer(1, 6))

    # ═══ SOURCES ═══
    story.append(Paragraph("<font name='BodyBold' size='7.5'>Sources</font>", S['disclaimer']))
    story.append(Spacer(1, 2))
    story.append(Paragraph(
        "Canada Revenue Agency (CRA): RRSP, TFSA, FHSA contribution limits 2026. "
        "Service Canada: OAS, GIS amounts, clawback thresholds Q1 2026. "
        "Retraite Qu\u00e9bec / Canada Pension Plan: QPP/CPP pension amounts 2026. "
        "Angus Reid Institute (2022): survey on unexpected expenses. "
        "Canadian Life and Health Insurance Association (CLHIA): disability statistics. "
        "Equifax Canada / TransUnion: credit score scale.", S['disclaimer']))

    story.append(Spacer(1, 8))
    story.append(Paragraph("<font name='BodyBold' size='7.5'>Important notice</font>", S['disclaimer']))
    story.append(Spacer(1, 2))
    story.append(Paragraph(
        "This guide is provided for informational and educational purposes only. It does not constitute "
        "personalized financial, tax, legal, or investment advice. The figures and thresholds "
        "mentioned are based on data available for the 2026 tax year and are subject to "
        "change. Tax situations vary from person to person and province to province. "
        "Consult a certified financial planner (CFP) or an authorized advisor before "
        "making any significant financial decision.", S['disclaimer']))
    story.append(Spacer(1, 10))
    story.append(Paragraph("\u00a9 2026 BuildFi  \u2022  buildfi.ca  \u2022  All rights reserved.",
        ParagraphStyle('cr', fontName='Body', fontSize=7, textColor=TEXT_LIGHT, leading=9, alignment=TA_CENTER)))

    doc.build(story)
    return path

if __name__ == "__main__":
    p = build()
    print(f"Generated: {p}")
