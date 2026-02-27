#!/usr/bin/env python3
"""
BuildFi — Guide 101 v2 : Les bases de vos finances
With real graphics, tables, better pagination, pull quotes.
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
        'saviez':    (MARINE_BG, MARINE, MARINE),
        'attention': (BRICK_BG,  BRICK,  BRICK),
        'bon':       (FOREST_BG, FOREST, FOREST),
        'quebec':    (MARINE_BG, QC_BLUE,QC_BLUE),
        'brief':     (SAND_LIGHT,GOLD,   GOLD),
    }
    LABELS = {
        'dollars': 'EN DOLLARS', 'saviez': 'LE SAVIEZ-VOUS?',
        'attention': 'ATTENTION', 'bon': 'BON À SAVOIR',
        'quebec': 'QUÉBEC', 'brief': 'EN BREF',
    }

    def __init__(self, box_type, title, content_paras, width=None):
        Flowable.__init__(self)
        self.box_type = box_type
        self.title_text = title
        self.content_paras = content_paras
        self._width = width or CW
        self._calc()

    def _cfg(self):
        return self.BOX_CFG.get(self.box_type, self.BOX_CFG['saviez'])

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
        p = P(f'<i>«\u00a0{self.text}\u00a0»</i>', S['pullquote'])
        _, h = p.wrap(aw - 60, 1000)
        self.height = h + 24
        self._p = p
        self._aw = aw
        return (aw, self.height)
    def draw(self):
        c = self.canv
        # top line
        c.setStrokeColor(GOLD_LIGHT); c.setLineWidth(1)
        mid = self._aw / 2
        c.line(mid-50, self.height-4, mid+50, self.height-4)
        # text
        self._p.drawOn(c, 30, 10)
        # bottom line
        c.line(mid-50, 6, mid+50, 6)


# ═══ GRAPHIC BUILDERS ═══

def make_budget_chart():
    """50/30/20 horizontal stacked bar"""
    d = Drawing(CW, 60)
    bar_y, bar_h = 20, 28
    w_need = CW * 0.50; w_want = CW * 0.30; w_future = CW * 0.20
    # bars
    d.add(Rect(0, bar_y, w_need, bar_h, fillColor=MARINE, strokeColor=None))
    d.add(Rect(w_need, bar_y, w_want, bar_h, fillColor=GOLD, strokeColor=None))
    d.add(Rect(w_need+w_want, bar_y, w_future, bar_h, fillColor=FOREST, strokeColor=None))
    # labels inside
    d.add(String(w_need/2, bar_y+9, "Besoins — 50 %", fontSize=9, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    d.add(String(w_need+w_want/2, bar_y+9, "Envies — 30 %", fontSize=9, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    d.add(String(w_need+w_want+w_future/2, bar_y+9, "Futur — 20 %", fontSize=8, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    # amounts below
    d.add(String(w_need/2, 4, "2 100 $", fontSize=8, fontName='Mono', fillColor=MARINE, textAnchor='middle'))
    d.add(String(w_need+w_want/2, 4, "1 260 $", fontSize=8, fontName='Mono', fillColor=GOLD, textAnchor='middle'))
    d.add(String(w_need+w_want+w_future/2, 4, "840 $", fontSize=8, fontName='Mono', fillColor=FOREST, textAnchor='middle'))
    return d

def make_debt_comparison():
    """Min payment vs fixed payment comparison - horizontal bars"""
    d = Drawing(CW, 80)
    lw = 140  # label width
    bw = CW - lw - 10
    # Row 1 - minimum
    y1 = 48
    d.add(String(0, y1+4, "Paiement minimum", fontSize=8.5, fontName='BodyBold', fillColor=BRICK))
    bar1_w = bw  # full = 30 years
    d.add(Rect(lw, y1, bar1_w, 18, fillColor=BRICK_BG, strokeColor=BRICK, strokeWidth=0.5))
    d.add(String(lw+bar1_w/2, y1+4, "30+ ans  •  12 000 $ d'intérêts", fontSize=8, fontName='Body', fillColor=BRICK, textAnchor='middle'))
    # Row 2 - fixed 200
    y2 = 16
    d.add(String(0, y2+4, "200 $/mois (fixe)", fontSize=8.5, fontName='BodyBold', fillColor=FOREST))
    bar2_w = bw * (2.67/30)  # 2.67 years out of 30
    d.add(Rect(lw, y2, bar2_w, 18, fillColor=FOREST_BG, strokeColor=FOREST, strokeWidth=0.5))
    d.add(String(lw+bar2_w+8, y2+4, "2 ans 8 mois  •  1 500 $ d'intérêts", fontSize=8, fontName='Body', fillColor=FOREST))
    # Title
    d.add(String(CW/2, 74, "5 000 $ de dette à 19,99 %", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))
    return d

def make_credit_scale():
    """Visual credit score scale"""
    d = Drawing(CW, 55)
    bar_y, bar_h = 22, 16
    # Segments
    segs = [
        (300, 600, BRICK, "Difficile"),
        (600, 650, HexColor('#e8a040'), "Passable"),
        (650, 700, GOLD, "Bon"),
        (700, 760, FOREST, "Très bon"),
        (760, 900, HexColor('#0e6930'), "Excellent"),
    ]
    total = 900 - 300
    for lo, hi, col, label in segs:
        x = (lo - 300) / total * CW
        w = (hi - lo) / total * CW
        d.add(Rect(x, bar_y, w, bar_h, fillColor=col, strokeColor=None))
        d.add(String(x + w/2, bar_y + 3, label, fontSize=7, fontName='BodyBold', fillColor=white, textAnchor='middle'))
    # Tick marks below
    for val in [300, 600, 650, 700, 760, 900]:
        x = (val - 300) / total * CW
        d.add(String(x, 10, str(val), fontSize=7, fontName='Mono', fillColor=TEXT_MED, textAnchor='middle'))
    # Title
    d.add(String(CW/2, 46, "Cote de crédit canadienne (Equifax / TransUnion)", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))
    return d

def make_rrq_chart():
    """RRQ/CPP at 60 vs 65 vs 70 - horizontal bars"""
    d = Drawing(CW, 85)
    lw = 70
    max_val = 1420
    bw = CW - lw - 60
    items = [
        ("70 ans", 1420, FOREST),
        ("65 ans", 1000, GOLD),
        ("60 ans", 640, BRICK),
    ]
    for i, (label, val, col) in enumerate(items):
        y = 8 + i * 25
        d.add(String(0, y+5, label, fontSize=9, fontName='BodyBold', fillColor=col))
        bar_w = val / max_val * bw
        d.add(Rect(lw, y, bar_w, 18, fillColor=col, strokeColor=None, rx=3, ry=3))
        d.add(String(lw + bar_w + 6, y+4, f"{val:,} $/mois".replace(",", " "), fontSize=8.5, fontName='Mono', fillColor=col))
    d.add(String(CW/2, 80, "Rente mensuelle estimée selon l'âge de début", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))
    return d

def make_cascade_flowchart():
    """Savings cascade as a vertical flow with arrows"""
    d = Drawing(CW, 225)
    box_w, box_h = 320, 22
    x0 = (CW - box_w) / 2
    steps = [
        ("1. Coussin d'urgence (3 mois)", MARINE),
        ("2. Contrepartie employeur REER", FOREST),
        ("3. Dettes > 7 % d'intérêt", BRICK),
        ("4. CELIAPP (si 1re maison)", GOLD),
        ("5. CÉLI", GOLD),
        ("6. REER", GOLD),
        ("7. Compte non enregistré", TEXT_MED),
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
    d.add(String(CW/2, 218, "La cascade d'épargne — ordre de priorité", fontSize=8.5, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))
    return d


# ═══ NEW GRAPHICS v8 ═══

def make_compound_interest_chart():
    """Exponential growth of 10K invested at different ages"""
    d = Drawing(CW, 130)
    d.add(String(CW/2, 122, "10 000 $ investis une seule fois — rendement de 7 %/an", fontSize=8.5, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))

    # Parameters
    lw = 100
    bw = CW - lw - 50
    max_val = 149745  # 10K at 7% for 40 years

    scenarios = [
        ("À 25 ans (40 ans)", 10000 * (1.07**40), 40, FOREST),
        ("À 35 ans (30 ans)", 10000 * (1.07**30), 30, GOLD),
        ("À 45 ans (20 ans)", 10000 * (1.07**20), 20, BRICK),
    ]

    for i, (label, final_val, years, col) in enumerate(scenarios):
        y = 88 - i * 32
        d.add(String(0, y+5, label, fontSize=8, fontName='BodyBold', fillColor=col))

        # Bar
        w = final_val / max_val * bw
        d.add(Rect(lw, y, w, 22, fillColor=col, strokeColor=None))

        # Initial amount marker
        w_init = 10000 / max_val * bw
        d.add(Rect(lw, y, w_init, 22, fillColor=None, strokeColor=white, strokeWidth=1))

        # Value label
        val_str = f"{final_val:,.0f} $".replace(",", "\u202f")
        d.add(String(lw + w + 6, y+5, val_str, fontSize=9, fontName='BodyBold', fillColor=col))

    # Legend
    d.add(String(lw, 8, "10 000 $ initial", fontSize=7, fontName='Body', fillColor=TEXT_MED))
    d.add(Line(lw+72, 12, lw+90, 12, strokeColor=white, strokeWidth=1.5))
    d.add(String(lw+95, 8, "= mise de départ", fontSize=7, fontName='Body', fillColor=TEXT_LIGHT))

    return d


def make_reer_vs_celi_chart():
    """REER vs CELI: who wins based on marginal rate change"""
    d = Drawing(CW, 110)
    d.add(String(CW/2, 102, "REER vs CÉLI — Qui gagne?", fontSize=8.5, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))

    lw = 155
    bw = CW - lw - 10

    scenarios = [
        ("Taux baisse à la retraite", "REER gagne", 0.72, MARINE, "Ex: 45 % → 30 %"),
        ("Taux stable", "Égalité", 0.50, GOLD, "Ex: 35 % → 35 %"),
        ("Taux monte à la retraite", "CÉLI gagne", 0.28, FOREST, "Ex: 30 % → 45 %"),
    ]

    for i, (label, winner, reer_frac, col, example) in enumerate(scenarios):
        y = 72 - i * 28
        d.add(String(0, y+8, label, fontSize=8, fontName='BodyBold', fillColor=TEXT_DARK))
        d.add(String(0, y-2, example, fontSize=7, fontName='Body', fillColor=TEXT_MED))

        # Stacked bar: REER portion vs CELI portion
        reer_w = reer_frac * bw
        celi_w = (1 - reer_frac) * bw
        d.add(Rect(lw, y, reer_w, 20, fillColor=MARINE, strokeColor=None))
        if reer_w > 30:
            d.add(String(lw + reer_w/2, y+5, "REER", fontSize=7.5, fontName='BodyBold', fillColor=white, textAnchor='middle'))
        d.add(Rect(lw + reer_w, y, celi_w, 20, fillColor=FOREST, strokeColor=None))
        if celi_w > 30:
            d.add(String(lw + reer_w + celi_w/2, y+5, "CÉLI", fontSize=7.5, fontName='BodyBold', fillColor=white, textAnchor='middle'))

        d.add(String(lw + bw + 6, y+5, winner, fontSize=7.5, fontName='BodyBold', fillColor=col))

    return d


def make_avalanche_vs_snowball():
    """Avalanche vs snowball debt repayment comparison"""
    d = Drawing(CW, 95)
    d.add(String(CW/2, 88, "3 dettes (carte 19,99 %, auto 6,5 %, ligne 9 %) — Remboursement en 3 ans", fontSize=8, fontName='BodyBold', fillColor=TEXT_MED, textAnchor='middle'))

    lw = 130
    bw = CW - lw - 80
    max_int = 4800  # scale

    items = [
        ("Avalanche", "(taux haut d'abord)", 3200, FOREST, "Coûte moins cher"),
        ("Boule de neige", "(petit solde d'abord)", 4100, GOLD, "Victoires rapides"),
        ("Paiement minimum", "(aucune stratégie)", 4800, BRICK, "Le plus coûteux"),
    ]

    for i, (label, sub, interest, col, note) in enumerate(items):
        y = 60 - i * 24
        d.add(String(0, y+8, label, fontSize=8, fontName='BodyBold', fillColor=col))
        d.add(String(0, y-2, sub, fontSize=6.5, fontName='Body', fillColor=TEXT_MED))

        w = interest / max_int * bw
        d.add(Rect(lw, y, w, 18, fillColor=col, strokeColor=None))
        val_str = f"{interest:,} $ d'intérêts".replace(",", "\u202f")
        d.add(String(lw + w + 6, y+3, val_str, fontSize=8, fontName='BodyBold', fillColor=col))
        d.add(String(lw + w + 6 + len(val_str)*5 + 20, y+3, note, fontSize=7, fontName='Body', fillColor=TEXT_MED))

    return d


# ═══ TABLE BUILDERS ═══

def make_accounts_table():
    """Comparison table: REER vs CELI vs CELIAPP"""
    header_style = ParagraphStyle('TH', fontName='BodyBold', fontSize=8, textColor=white, leading=10, alignment=TA_CENTER)
    cell_style = ParagraphStyle('TC', fontName='Body', fontSize=8, textColor=TEXT_DARK, leading=11)
    cell_bold = ParagraphStyle('TCB', fontName='BodyBold', fontSize=8, textColor=MARINE, leading=11, alignment=TA_CENTER)

    data = [
        [Paragraph('', header_style), Paragraph('REER', header_style), Paragraph('CÉLI', header_style), Paragraph('CELIAPP', header_style)],
        [Paragraph('<b>Cotisation déductible?</b>', cell_style), Paragraph('Oui', cell_bold), Paragraph('Non', cell_bold), Paragraph('Oui', cell_bold)],
        [Paragraph('<b>Retraits imposables?</b>', cell_style), Paragraph('Oui', cell_bold), Paragraph('Non', cell_bold), Paragraph('Non*', cell_bold)],
        [Paragraph('<b>Max annuel 2026</b>', cell_style), Paragraph('33 810 $', cell_bold), Paragraph('7 000 $', cell_bold), Paragraph('8 000 $', cell_bold)],
        [Paragraph('<b>Cumul disponible</b>', cell_style), Paragraph('Variable', cell_bold), Paragraph('109 000 $', cell_bold), Paragraph('40 000 $', cell_bold)],
        [Paragraph('<b>Âge limite</b>', cell_style), Paragraph('71 ans', cell_bold), Paragraph('Aucun', cell_bold), Paragraph('71 ans / 15 ans', cell_bold)],
        [Paragraph('<b>Affecte PSV/SRG?</b>', cell_style), Paragraph('Oui (retrait)', cell_bold), Paragraph('Non', cell_bold), Paragraph('Non*', cell_bold)],
        [Paragraph('<b>Idéal pour</b>', cell_style), Paragraph('Revenu élevé →\nplus bas à la retraite', cell_style), Paragraph('Flexibilité\nlibre d\'impôt', cell_style), Paragraph('1re maison', cell_style)],
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
        # Alternate row shading
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
    canvas.drawRightString(W-MR, MB-22, f"Les bases de vos finances — p.\u2009{doc.page}")
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
    canvas.drawString(ML+10, H-130, "Les bases de")
    canvas.drawString(ML+10, H-165, "vos finances")
    canvas.setFont('Body', 11); canvas.setFillColor(HexColor('#a0b0cc'))
    canvas.drawString(ML+10, H-198, "Ce que tout Canadien devrait savoir")
    canvas.setFont('Body', 11)
    canvas.drawString(ML+10, H-214, "— en langage clair.")
    canvas.setFillColor(GOLD); canvas.rect(0, H-273, W, 3, fill=1, stroke=0)
    canvas.setFont('DisplayItalic', 13); canvas.setFillColor(MARINE)
    canvas.drawString(ML+10, H-320, "Budget. Dettes. Épargne. Retraite.")
    canvas.drawString(ML+10, H-340, "Dans le bon ordre.")
    canvas.setFont('Body', 9.5); canvas.setFillColor(TEXT_MED)
    y = H - 385
    for line in [
        "Ce guide vous donne les outils pour décider vous-même.",
        "Pas de jargon. Pas de vente déguisée. Juste ce que",
        "vous devez savoir, avec des exemples en dollars.",
    ]:
        canvas.drawString(ML+10, y, line); y -= 15
    
    # Key highlights section
    y -= 20
    canvas.setStrokeColor(GOLD_LIGHT); canvas.setLineWidth(0.5)
    canvas.line(ML+10, y, ML+150, y)
    y -= 18
    
    highlights = [
        ("Budget", "La méthode 50/30/20 en 3 minutes"),
        ("Dettes", "Pourquoi rembourser avant d'épargner"),
        ("Épargne", "L'ordre exact : coussin → CÉLI → REER"),
        ("Comptes", "REER vs CÉLI vs CELIAPP — en un tableau"),
        ("Retraite", "RRQ, PSV, SRG — combien vous recevrez"),
    ]
    for title, desc in highlights:
        canvas.setFont('BodyBold', 8); canvas.setFillColor(GOLD)
        canvas.drawString(ML+10, y, title)
        canvas.setFont('Body', 8); canvas.setFillColor(TEXT_MED)
        canvas.drawString(ML+75, y, desc)
        y -= 14
    canvas.setFont('Body', 8.5); canvas.setFillColor(TEXT_LIGHT)
    canvas.drawString(ML+10, 72, "Inclus avec votre Bilan Essentiel BuildFi")
    canvas.setFont('Body', 7.5)
    canvas.drawString(ML+10, 58, "Chiffres à jour — Année fiscale 2026  •  Adapté au Québec et au Canada")
    canvas.setFillColor(GOLD); canvas.rect(0, 0, W, 4, fill=1, stroke=0)
    canvas.restoreState()

# ═══ BUILD DOCUMENT ═══

def build():
    path = "/home/claude/guide-101-v8.pdf"
    doc = BaseDocTemplate(path, pagesize=letter,
        leftMargin=ML, rightMargin=MR, topMargin=MT, bottomMargin=MB,
        title="BuildFi — Les bases de vos finances (101)",
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
    story.append(Paragraph("Dans ce guide", S['ch_title']))
    story.append(GoldRule(70, 1.5))
    story.append(Spacer(1, 10))
    for num, title, sub in [
        ("1","Votre portrait financier","Savoir où vous en êtes"),
        ("2","Le budget","Votre plan de match"),
        ("3","La dette","Le mur avant l'épargne"),
        ("4","Le crédit","Le score invisible"),
        ("5","L'épargne","La cascade de vos dollars"),
        ("6","Vos comptes expliqués","REER, CÉLI, CELIAPP — sans jargon"),
        ("7","Le gouvernement et vous","RRQ, PSV, SRG — ce que vous recevrez"),
        ("8","Protéger votre plan","Les assurances essentielles"),
        ("9","Votre prochain pas","5 actions concrètes"),
    ]:
        story.append(Paragraph(
            f'<font name="DisplayBold" color="#b8860b" size="12">{num}</font>'
            f'&nbsp;&nbsp;<font name="BodyBold" size="9.5" color="#1a2744">{title}</font>'
            f'&nbsp;&nbsp;<font name="Body" size="8" color="#888888">— {sub}</font>', S['toc_item']))
    story.append(Spacer(1, 16))
    story.append(InfoBox('saviez', 'PAR OÙ COMMENCER?', [
        '<font name="BodyBold">Dettes à intérêt élevé?</font> → Chapitre 3. '
        '<font name="BodyBold">Vous épargnez déjà?</font> → Chapitre 5. '
        '<font name="BodyBold">Proche de la retraite?</font> → Chapitres 6-7. '
        '<font name="BodyBold">Vous partez de zéro?</font> → Lisez dans l\'ordre.',
    ]))

    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "<font name='Body' size='8' color='#888888'>"
        "Ce guide est fourni à titre informatif et éducatif seulement. Il ne constitue pas un conseil financier, "
        "fiscal, juridique ou de placement personnalisé. Les stratégies et exemples présentés sont de nature générale "
        "et pourraient ne pas convenir à votre situation. Consultez un professionnel certifié avant toute décision."
        "</font>", S['body']))
    story.append(Spacer(1, 16))

    # ═══ CH 1 — PORTRAIT ═══
    story.append(KeepTogether([
        ChapterHeader("1", "Votre portrait financier", "Savoir où vous en êtes — en 5 minutes"),
        GoldRule(50, 1.5), Spacer(1, 10),
        Paragraph(
            "Avant de parler budget ou retraite, une question\u00a0: <font name='BodyBold'>où en êtes-vous aujourd'hui?</font> "
            "Pas en termes de salaire — en termes de valeur nette. Tout ce que vous possédez, moins tout ce que vous devez. "
            "C'est le seul chiffre qui mesure votre santé financière réelle.", S['body_intro']),
    ]))
    story.append(InfoBox('dollars', 'EN DOLLARS — Exemple concret', [
        '<font name="BodyBold">Actifs\u00a0:</font> Compte bancaire 3\u202f200\u00a0$ + CÉLI 12\u202f000\u00a0$ + REER 28\u202f000\u00a0$ + Maison 385\u202f000\u00a0$ = <font name="BodyBold">428\u202f200\u00a0$</font>',
        '<font name="BodyBold">Passifs\u00a0:</font> Hypothèque 295\u202f000\u00a0$ + Carte de crédit 4\u202f800\u00a0$ + Prêt auto 18\u202f000\u00a0$ = <font name="BodyBold">317\u202f800\u00a0$</font>',
        '<font name="BodyBold">Valeur nette\u00a0: 110\u202f400\u00a0$</font> — C\'est votre point de départ. L\'objectif\u00a0: faire bouger ce chiffre vers le haut, mois après mois.',
    ]))
    story.append(Spacer(1, 10))
    story.append(InfoBox('bon', 'BON À SAVOIR', [
        'Une valeur nette négative en début de carrière (prêt étudiant, hypothèque récente), c\'est normal. L\'important c\'est la <font name="BodyBold">tendance</font>\u00a0: est-ce que ça monte chaque année?',
    ]))

    # ═══ CH 2 — BUDGET ═══
    story.append(Spacer(1, 24))
    story.append(ChapterHeader("2", "Le budget — votre plan de match", "Pas une punition. Un outil de liberté."))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Le mot «\u00a0budget\u00a0» ne fait rêver personne. Mais un budget, ce n'est pas une liste d'interdictions — "
        "c'est un plan qui vous permet de <font name='BodyBold'>choisir en toute conscience</font> où va votre argent. "
        "La méthode la plus simple\u00a0: diviser votre revenu net en trois catégories.", S['body_intro']))

    story.append(Paragraph("Besoins / Envies / Futur", S['h2']))
    story.append(make_budget_chart())
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "<font name='Body' size='8.5' color='#555555'>"
        "Exemple basé sur un revenu net de 4\u202f200\u00a0$/mois. Si vous n'arrivez pas à 20\u00a0% pour le Futur, commencez à 10\u00a0%. Même 5\u00a0%.</font>",
        ParagraphStyle('sm', fontName='Body', fontSize=8.5, textColor=TEXT_MED, leading=12, alignment=TA_CENTER, spaceAfter=8)))

    story.append(Paragraph(
        "<font name='BodyBold'>Besoins (50\u00a0%)</font> — logement, épicerie, transport, assurances, paiements minimums. "
        "<font name='BodyBold'>Envies (30\u00a0%)</font> — restaurants, sorties, abonnements, hobbies. "
        "<font name='BodyBold'>Futur (20\u00a0%)</font> — remboursement accéléré des dettes, épargne, investissements. "
        "C'est la catégorie que la plupart des gens «\u00a0oublient\u00a0» — et c'est celle qui construit votre liberté.", S['body']))

    story.append(InfoBox('attention', 'ATTENTION — La fuite silencieuse', [
        'Le Canadien moyen paie 100 à 200\u00a0$/mois en abonnements récurrents (streaming, gym, apps, cloud). '
        'C\'est 1\u202f200 à 2\u202f400\u00a0$/an — l\'équivalent d\'un voyage ou d\'une année de CÉLI.',
        '<font name="BodyBold">Exercice\u00a0:</font> Ouvrez vos 3 derniers relevés. Surlignez chaque paiement récurrent. Additionnez. Multipliez par 12.',
    ]))
    story.append(Spacer(1, 10))
    story.append(InfoBox('saviez', 'LE SAVIEZ-VOUS? — Le coût en heures de travail', [
        'À 25\u00a0$/h net\u00a0: un café à 6\u00a0$ = <font name="BodyBold">15 min de travail</font>. '
        'Un souper à 150\u00a0$ = <font name="BodyBold">6 heures</font>. '
        'Un véhicule neuf à 45\u202f000\u00a0$ = <font name="BodyBold">1\u202f800 heures — presque une année</font>. '
        'Ce n\'est pas pour culpabiliser. C\'est pour décider en pleine conscience.',
    ]))
    story.append(Spacer(1, 10))
    story.append(InfoBox('brief', 'EN BREF', [
        '• <font name="BodyBold">50/30/20</font> — Besoins, Envies, Futur. Simple et efficace.',
        '• Auditez vos abonnements — 100 à 200\u00a0$/mois invisibles.',
        '• <font name="BodyBold">Automatisez</font> — payez votre épargne comme votre loyer, le 1er du mois.',
    ]))

    # ═══ CH 3 — DETTE ═══
    story.append(Spacer(1, 24))
    story.append(ChapterHeader("3", "La dette — le mur avant l'épargne", "Chaque dollar sur votre carte vaut double"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Inutile de parler d'épargne-retraite si vous payez 19,99\u00a0% d'intérêt sur une carte de crédit. "
        "Rembourser une dette à 20\u00a0% équivaut à un «\u00a0placement\u00a0» à rendement fixe de 20\u00a0% — "
        "difficile de trouver mieux sur les marchés.", S['body_intro']))

    story.append(Paragraph("Le piège du paiement minimum", S['h2']))
    story.append(make_debt_comparison())
    story.append(Spacer(1, 6))

    story.append(Paragraph("Deux stratégies de remboursement", S['h2']))
    story.append(Paragraph(
        "<font name='BodyBold'>Avalanche</font> — payez le minimum partout, puis concentrez chaque dollar supplémentaire "
        "sur la dette au taux le plus élevé. C'est l'option qui minimise les intérêts totaux. "
        "<font name='BodyBold'>Boule de neige</font> — même principe, mais en ciblant le plus petit solde d'abord. "
        "Les victoires rapides créent un élan psychologique puissant.", S['body']))

    story.append(make_avalanche_vs_snowball())
    story.append(Spacer(1, 6))

    story.append(InfoBox('bon', 'BON À SAVOIR — La règle du 7\u00a0%', [
        'En règle générale, il peut être avantageux de rembourser toute dette > 7\u00a0% <font name="BodyBold">avant</font> d\'épargner pour la retraite. Pourquoi? 7\u00a0% correspond au rendement historique moyen des marchés. En éliminant une dette à 20\u00a0%, vous obtenez l\'équivalent d\'un rendement de 20\u00a0% sans risque de marché. Chaque situation est différente — la fiscalité, la tolérance au risque et la liquidité comptent aussi.',
        '<font name="BodyBold">Exception\u00a0:</font> la contrepartie de l\'employeur au REER — c\'est-à-dire l\'argent que votre employeur ajoute quand vous cotisez (rendement instantané de 50 à 100\u00a0%). Cotisez assez pour obtenir la contrepartie complète, même avec des dettes.',
    ]))
    story.append(Spacer(1, 10))
    story.append(InfoBox('brief', 'EN BREF', [
        '• En règle générale, une dette > 7\u00a0% devrait être remboursée avant d\'épargner pour la retraite',
        '• <font name="BodyBold">Avalanche</font> (taux haut d\'abord) = optimal en $  •  <font name="BodyBold">Boule de neige</font> (petit solde d\'abord) = optimal en motivation',
        '• Le paiement minimum est un piège — fixez un montant et respectez-le',
    ]))

    # ═══ CH 4 — CRÉDIT ═══
    story.append(ChapterHeader("4", "Le crédit — le score invisible", "Celui qui décide si vous obtenez cette hypothèque"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Votre cote de crédit (300-900) résume votre historique d'emprunteur. Vous ne la voyez jamais, "
        "mais elle influence votre taux hypothécaire, votre capacité à louer, vos primes d'assurance "
        "et parfois vos perspectives d'emploi.", S['body_intro']))

    story.append(make_credit_scale())
    story.append(Spacer(1, 14))

    story.append(Paragraph("Ce qui fait monter (ou descendre) votre cote", S['h2']))
    story.append(Paragraph(
        "<font name='BodyBold'>Historique de paiement (~35\u00a0%)</font> — Payez à temps, toujours. Un retard de 30\u00a0jours ou plus peut "
        "coûter 50 à 100 points et rester jusqu'à 6 ans sur votre dossier. "
        "<font name='BodyBold'>Utilisation du crédit (~30\u00a0%)</font> — Gardez vos soldes sous 30\u00a0% de la limite. "
        "Carte à 10\u202f000\u00a0$ → gardez le solde sous 3\u202f000\u00a0$. "
        "<font name='BodyBold'>Autres facteurs (~35\u00a0%)</font> — ancienneté des comptes (ne fermez pas vos vieilles cartes), "
        "diversité du crédit, nombre de demandes récentes.", S['body']))

    story.append(InfoBox('bon', 'BON À SAVOIR — Vérifiez gratuitement', [
        'Equifax et TransUnion offrent un accès gratuit annuel. Borrowell et Credit Karma aussi. '
        '<font name="BodyBold">Vérifier votre propre cote ne l\'affecte pas</font> — c\'est une enquête «\u00a0douce\u00a0».',
    ]))
    story.append(Spacer(1, 10))
    story.append(InfoBox('attention', 'ATTENTION — Mythe répandu', [
        '<font name="BodyBold">«\u00a0Porter un solde améliore votre cote.\u00a0»</font> Faux. Vous n\'avez jamais besoin de payer des intérêts pour bâtir du crédit. '
        'Payez votre solde au complet chaque mois — c\'est la meilleure stratégie.',
    ]))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "<font name='BodyBold'>L'impact en dollars\u00a0:</font> une différence de cote entre 650 et 760 sur une hypothèque "
        "de 400\u202f000\u00a0$ peut représenter 0,5\u00a0% de taux supplémentaire — soit plus de 45\u202f000\u00a0$ d'intérêts "
        "sur 25 ans. Votre cote a un prix réel.", S['body']))

    # ═══ CH 5 — CASCADE ÉPARGNE ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("5", "L'épargne — la cascade de vos dollars", "Chaque dollar a une place optimale"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Vous dégagez un surplus mensuel. La question\u00a0: <font name='BodyBold'>où mettre cet argent en premier?</font> "
        "Voici l'ordre logique, du plus urgent au moins urgent.", S['body_intro']))

    story.append(make_cascade_flowchart())
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "<font name='BodyBold'>Étape 1 — le coussin d'urgence</font> est la base\u00a0: 3 mois de dépenses essentielles dans un "
        "compte facilement accessible (CÉLI-épargne à intérêt élevé). Ce n'est pas un investissement — "
        "c'est un filet qui vous empêche de retomber dans la dette à 20\u00a0% si une urgence survient.", S['body']))

    story.append(InfoBox('saviez', 'LE SAVIEZ-VOUS?', [
        'La moitié des Canadiens (51\u00a0%) disent ne pas pouvoir couvrir une dépense imprévue de 1\u202f000\u00a0$ sans emprunter (Angus Reid, 2022). Le coussin d\'urgence, c\'est ce qui sépare la stabilité de la spirale.',
    ]))
    story.append(Spacer(1, 4))

    story.append(InfoBox('dollars', 'EN DOLLARS — Où va chaque dollar?', [
        '<font name="BodyBold">300\u00a0$/mois\u00a0:</font> Coussin pas plein? → Tout en CÉLI-épargne. Coussin OK + contrepartie? → 150\u00a0$ REER + 150\u00a0$ CÉLI.',
        '<font name="BodyBold">1\u202f000\u00a0$/mois\u00a0:</font> Projet immobilier? → 667\u00a0$ CELIAPP + 333\u00a0$ CÉLI. Pas de projet? → 583\u00a0$ CÉLI + 417\u00a0$ REER.',
    ]))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Le temps — votre meilleur allié", S['h2']))
    story.append(Paragraph(
        "Les intérêts composés sont la force la plus puissante en finances personnelles. "
        "Votre argent génère des rendements, et ces rendements génèrent à leur tour des rendements. "
        "Plus vous commencez tôt, plus l'effet est dramatique.", S['body']))
    story.append(make_compound_interest_chart())
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "La personne qui commence à 25 ans finit avec <font name='BodyBold'>presque le double</font> "
        "de celle qui commence à 35 ans — avec exactement la même mise de départ. "
        "La différence? 10 ans de croissance composée de plus. C'est pourquoi le meilleur moment "
        "pour commencer à épargner est maintenant.", S['body']))

    story.append(Spacer(1, 16))

    # ═══ CH 6 — COMPTES ═══
    story.append(ChapterHeader("6", "Vos comptes expliqués", "REER, CÉLI, CELIAPP — sans jargon"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Chaque compte a ses propres règles. Ce tableau résume l'essentiel d'un coup d'œil.", S['body_intro']))

    story.append(make_accounts_table())
    story.append(Paragraph(
        "<font name='Body' size='7.5' color='#888888'>* Retraits CELIAPP libres d'impôt uniquement pour l'achat d'une première propriété admissible.</font>",
        ParagraphStyle('fn', fontName='Body', fontSize=7.5, textColor=TEXT_LIGHT, leading=10, spaceBefore=3, spaceAfter=10)))

    story.append(Paragraph(
        "<font name='BodyBold'>REER</font> — Chaque dollar cotisé réduit votre impôt cette année. "
        "Votre argent croît à l'abri de l'impôt. Mais chaque dollar retiré est imposable. "
        "Peut être avantageux si votre taux d'impôt actuel est plus élevé que celui prévu à la retraite.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>CÉLI</font> — Pas de déduction d'impôt à l'entrée, mais tout ce qui sort est "
        "100\u00a0% libre d'impôt. Les retraits ne comptent pas comme du revenu — ils ne touchent pas "
        "votre PSV, votre SRG ou vos prestations gouvernementales. Peut contenir les mêmes placements qu'un REER.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>CELIAPP</font> — Combine les avantages du REER et du CÉLI pour une première maison. "
        "Déduction d'impôt comme le REER + retraits libres d'impôt comme le CÉLI. "
        "8\u202f000\u00a0$/an, 40\u202f000\u00a0$ à vie. Il peut être avantageux de l'ouvrir même sans cotiser — les droits s'accumulent.", S['body']))

    story.append(Paragraph("REER ou CÉLI en premier?", S['h2']))
    story.append(Paragraph(
        "C'est la question la plus fréquente. La réponse dépend d'une seule variable\u00a0: "
        "votre taux d'imposition maintenant vs à la retraite.", S['body']))
    story.append(make_reer_vs_celi_chart())
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "<font name='BodyBold'>En pratique</font>\u00a0: si vous gagnez plus de ~55\u202f000\u00a0$/an, "
        "le REER est généralement avantageux. En dessous, le CÉLI est souvent préférable. "
        "En cas de doute\u00a0: le CÉLI est souvent un bon point de départ — sa flexibilité (retraits libres d'impôt, "
        "aucun impact sur les prestations) en fait le compte le plus polyvalent.", S['body']))

    story.append(InfoBox('attention', 'ATTENTION — Le piège du REER trop gros', [
        'Un REER de 2 millions\u00a0$ à 71 ans = retraits obligatoires de ~106\u202f000\u00a0$/an au FERR (Fonds enregistré de revenu de retraite). Ce revenu peut déclencher la récupération de votre PSV et vous propulser dans une tranche d\'impôt élevée. Le guide 201 couvre les stratégies pour éviter ce piège.',
    ]))

    story.append(InfoBox('quebec', 'QUÉBEC', [
        'Vous produisez <font name="BodyBold">deux déclarations</font> (fédérale + provinciale). Taux marginaux parmi les plus élevés au Canada — le REER y est particulièrement avantageux pour les hauts revenus. Les règles des comptes enregistrés sont les mêmes partout — c\'est la fiscalité qui varie.',
    ]))

    story.append(Spacer(1, 16))

    # ═══ CH 7 — GOUVERNEMENT ═══
    story.append(ChapterHeader("7", "Le gouvernement et vous", "Ce que vous recevrez — et quand"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Le système de retraite canadien repose sur trois piliers\u00a0: le gouvernement, votre employeur (si applicable), "
        "et vous-même. Commençons par le premier — celui que tout le monde reçoit mais que peu comprennent.", S['body_intro']))

    story.append(InfoBox('quebec', 'QUÉBEC vs RESTE DU CANADA', [
        'Au Québec\u00a0: <font name="BodyBold">Régime de rentes du Québec (RRQ)</font>. Ailleurs\u00a0: <font name="BodyBold">Régime de pensions du Canada (RPC)</font>. Les règles sont similaires, mais les montants et calculs diffèrent légèrement. Si vous avez travaillé aux deux endroits, vos cotisations sont consolidées.',
    ]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Le RRQ / RPC — Le choix de l'âge change tout", S['h2']))
    story.append(make_rrq_chart())
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "La rente maximale en 2026 à 65 ans est de 1\u202f508\u00a0$/mois. "
        "Mais la <font name='BodyBold'>moyenne réelle</font> pour les nouveaux retraités est d'environ 900\u00a0$/mois. "
        "Le choix 60/65/70 est permanent — il affecte votre revenu pour le reste de votre vie.", S['body']))
    story.append(Paragraph(
        "Depuis 2019, le RRQ/RPC est graduellement bonifié\u00a0: les travailleurs qui cotisent après 2019 "
        "accumulent des droits supplémentaires. Les jeunes générations recevront davantage.", S['body']))

    story.append(Paragraph("La PSV — Universelle mais récupérable", S['h2']))
    story.append(Paragraph(
        "Versée à la plupart des Canadiens à partir de 65 ans (40 ans de résidence pour le montant complet). "
        "Maximum Q1 2026\u00a0: 742\u00a0$/mois (65-74 ans), 817\u00a0$/mois (75+). "
        "La PSV est indexée trimestriellement à l'inflation — votre pouvoir d'achat est protégé.", S['body']))
    story.append(InfoBox('attention', 'ATTENTION — Récupération de la PSV', [
        'Revenu net > <font name="BodyBold">95\u202f323\u00a0$</font> en 2026? Le gouvernement récupère 15\u00a0¢ par dollar au-dessus. À ~152\u202f000\u00a0$, votre PSV tombe à zéro. Sur 20-25 ans = potentiellement <font name="BodyBold">100\u202f000\u00a0$ et plus en prestations perdues</font>. Le guide 201 couvre les stratégies pour protéger votre PSV.',
    ]))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Le SRG — Le bonus pour revenus modestes", S['h2']))
    story.append(Paragraph(
        "Supplément non imposable pour retraités à faible revenu recevant la PSV. "
        "Maximum Q1 2026 (personne seule)\u00a0: 1\u202f109\u00a0$/mois. Les retraits du CÉLI ne l'affectent pas — "
        "ceux du REER le réduisent. C'est une raison majeure de privilégier le CÉLI si vous prévoyez "
        "un faible revenu à la retraite.", S['body']))

    story.append(InfoBox('brief', 'EN BREF — Les prestations gouvernementales', [
        '• <font name="BodyBold">RRQ/RPC</font> — Basé sur vos cotisations. Choix 60/65/70 = permanent. Max 1\u202f508\u00a0$/mois. Moyenne ~900\u00a0$/mois.',
        '• <font name="BodyBold">PSV</font> — Universelle à 65 ans, 742\u00a0$/mois. Indexée à l\'inflation. Récupérée si revenu > 95\u202f323\u00a0$.',
        '• <font name="BodyBold">SRG</font> — Revenus modestes, jusqu\'à 1\u202f109\u00a0$/mois, non imposable. Le CÉLI le protège.',
    ]))

    story.append(Spacer(1, 14))

    # ═══ CH 8 — ASSURANCES ═══
    story.append(KeepTogether([
        ChapterHeader("8", "Protéger votre plan", "Les assurances que vous ne pouvez pas ignorer"),
        GoldRule(50, 1.5), Spacer(1, 10),
        Paragraph(
            "Un plan financier sans protection, c'est un château de cartes. "
            "Si votre revenu disparaît demain, tout s'écroule.", S['body_intro']),
        InfoBox('saviez', 'LE SAVIEZ-VOUS?', [
            'Un Canadien sur trois sera invalide 90\u00a0jours ou plus avant 65 ans (CLHIA). Les gens assurent leur voiture mais pas leur capacité à gagner un revenu — qui est de loin leur actif le plus précieux.',
        ]),
    ]))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "L'ordre n'est pas un hasard\u00a0: la probabilité d'être invalide avant 65 ans est plus élevée "
        "que celle d'un décès prématuré. L'invalidité est le risque le plus sous-estimé.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>1. Assurance invalidité</font> — Remplace une partie de votre revenu si vous ne pouvez plus travailler. "
        "Vérifiez votre couverture employeur. Si vous êtes travailleur autonome\u00a0: c'est un élément à considérer en priorité.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>2. Assurance vie</font> — Essentielle si quelqu'un dépend de votre revenu (conjoint, enfants). "
        "Terme simple (10 ou 20 ans) = abordable et suffisante pour la majorité des familles. "
        "Exemple\u00a0: homme de 35 ans non-fumeur, 500\u202f000\u00a0$ de couverture sur 20 ans = environ 30 à 45\u00a0$/mois.", S['body']))
    story.append(Paragraph(
        "<font name='BodyBold'>3. Maladie grave</font> — Montant forfaitaire si diagnostic couvert (cancer, AVC, crise cardiaque). "
        "Couvre les dépenses non médicales\u00a0: hypothèque, épicerie, transport pendant le rétablissement.", S['body']))

    story.append(InfoBox('bon', 'BON À SAVOIR — Vérifiez avant d\'acheter', [
        'Beaucoup de Canadiens sont déjà couverts par leur employeur sans le savoir. Avant d\'acheter une assurance individuelle, vérifiez votre couverture collective — elle pourrait couvrir 60 à 70\u00a0% de votre salaire en cas d\'invalidité.',
    ]))

    # ═══ ERREURS FRÉQUENTES ═══
    story.append(Spacer(1, 22))
    story.append(Paragraph(
        '<font name="DisplayBold" size="18" color="#b91c1c">Les 5 erreurs qui coûtent le plus cher</font>', S['ch_title']))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Ces erreurs sont fréquentes, coûteuses et évitables. Si vous ne retenez qu'une chose de ce guide, "
        "c'est cette liste.", S['body_intro']))

    erreurs = [
        ("1. Ignorer la contrepartie employeur",
         "Si votre employeur offre 50\u00a0% de contrepartie sur vos cotisations REER, ne pas cotiser revient à "
         "renoncer à un rendement instantané de 50\u00a0%. C'est l'un des rares avantages financiers sans risque de marché. "
         "Il peut être avantageux de cotiser au moins assez pour obtenir la contrepartie complète — même avec des dettes."),
        ("2. Payer le minimum sur les cartes de crédit",
         "Sur 5\u202f000\u00a0$ à 19,99\u00a0%, le paiement minimum vous coûte 12\u202f000\u00a0$ d'intérêts et 30 ans. "
         "Un montant fixe de 200\u00a0$/mois\u00a0: 1\u202f500\u00a0$ d'intérêts et 2 ans 8 mois. La différence est énorme."),
        ("3. Attendre «\u00a0le bon moment\u00a0» pour investir",
         "Le meilleur moment pour investir était il y a 20 ans. Le deuxième meilleur moment est aujourd'hui. "
         "Attendre le creux du marché est impossible — même les professionnels n'y arrivent pas. "
         "Un montant automatique chaque mois élimine la décision."),
        ("4. Oublier les abonnements récurrents",
         "La moyenne canadienne dépense plus de 200\u00a0$/mois en abonnements (streaming, gym, apps, etc.). "
         "Passez vos 3 derniers relevés au peigne fin. Chaque 15\u00a0$/mois éliminé = 180\u00a0$/an → "
         "investi pendant 30 ans à 7\u00a0% = 17\u202f000\u00a0$."),
        ("5. Garder un fonds commun à 2,2\u00a0% de frais",
         "Sur 30 ans, la différence entre 0,25\u00a0% (FNB indiciel) et 2,20\u00a0% (fonds commun) sur 200\u202f000\u00a0$ "
         "représente plus de 200\u202f000\u00a0$. Vos frais de gestion sont le facteur le plus prévisible "
         "de votre rendement à long terme — et le seul que vous contrôlez entièrement."),
    ]
    for title, desc in erreurs:
        story.append(Paragraph(
            f"<font name='BodyBold' color='#b91c1c'>{title}</font>", S['body']))
        story.append(Paragraph(desc, S['body']))
        story.append(Spacer(1, 4))

    # ═══ CH 9 — PROCHAIN PAS ═══
    story.append(Spacer(1, 22))
    story.append(ChapterHeader("9", "Votre prochain pas", "5 actions concrètes — cette semaine"))
    story.append(GoldRule(50, 1.5)); story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Vous avez les bases. L'important maintenant\u00a0: passer à l'action. Pas demain. Cette semaine.", S['body_intro']))

    story.append(PullQuote("Personne ne regrette d'avoir commencé trop tôt. Tout le monde regrette d'avoir attendu."))
    story.append(Spacer(1, 4))

    actions = [
        ("1", "Calculez votre valeur nette.", "5 minutes. Ce que vous possédez − ce que vous devez. Écrivez le chiffre."),
        ("2", "Auditez vos abonnements.", "3 derniers relevés bancaires. Surlignez chaque paiement récurrent. Décidez ce qui reste."),
        ("3", "Automatisez un transfert.", "Même 50\u00a0$/paie vers un CÉLI ou CELIAPP. L'argent invisible ne se dépense pas."),
        ("4", "Vérifiez votre couverture employeur.", "Contrepartie REER? Assurance invalidité? Vous pourriez découvrir des avantages sous-utilisés."),
        ("5", "Vérifiez votre cote de crédit.", "Borrowell ou Credit Karma, c'est gratuit. Si elle est sous 700, les chapitres 3 et 4 sont votre priorité."),
    ]
    for num, title, desc in actions:
        story.append(Paragraph(
            f"<font name='DisplayBold' color='#b8860b' size='13'>{num}</font>&nbsp;&nbsp;"
            f"<font name='BodyBold'>{title}</font> {desc}", S['body']))

    story.append(Spacer(1, 10))
    story.append(GoldRule(80, 1))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Ce guide vous a donné les bases. Votre Bilan BuildFi va plus loin\u00a0:", S['body']))

    story.append(InfoBox('dollars', 'CE QUE VOTRE BILAN VOUS DONNE', [
        '<font name="BodyBold">Note de préparation</font> — Un score de 0 à 100 qui résume votre situation.',
        '<font name="BodyBold">Observations personnalisées</font> — Ce qui va bien. Ce qui mérite attention. Ce que vous pouvez faire.',
        '<font name="BodyBold">Simulation Monte Carlo</font> — 5\u202f000 scénarios de marché testés sur votre plan, pas des moyennes génériques.',
    ]))

    story.append(Spacer(1, 16))

    # ═══ PRINCIPES BUILDFI ═══
    story.append(InfoBox('bon', 'Les 3 principes BuildFi', [
        '<font name="BodyBold">1. Sécurité avant rendement.</font> Un coussin d\'urgence solide vaut plus qu\'un rendement de 12\u00a0% sur un portefeuille fragile.',
        '<font name="BodyBold">2. Liquidité avant optimisation fiscale.</font> L\'argent accessible en cas d\'urgence passe avant la stratégie fiscale parfaite.',
        '<font name="BodyBold">3. Simplicité avant sophistication.</font> Un plan simple que vous suivez bat un plan complexe que vous abandonnez.',
    ]))

    story.append(Spacer(1, 14))
    story.append(GoldRule(CW - 60, 0.5))
    story.append(Spacer(1, 6))

    # ═══ SOURCES ═══
    story.append(Paragraph("<font name='BodyBold' size='7.5'>Sources</font>", S['disclaimer']))
    story.append(Spacer(1, 2))
    story.append(Paragraph(
        "Agence du revenu du Canada (ARC)\u00a0: plafonds REER, CÉLI, CELIAPP 2026. "
        "Service Canada\u00a0: montants PSV, SRG, seuils de récupération Q1\u00a02026. "
        "Retraite Québec / Régime de pensions du Canada\u00a0: rentes RRQ/RPC 2026. "
        "Angus Reid Institute (2022)\u00a0: sondage sur les dépenses imprévues. "
        "Association canadienne des compagnies d'assurances de personnes (CLHIA)\u00a0: statistiques d'invalidité. "
        "Equifax Canada / TransUnion\u00a0: échelle de cotes de crédit.", S['disclaimer']))

    story.append(Spacer(1, 8))
    story.append(Paragraph("<font name='BodyBold' size='7.5'>Avis important</font>", S['disclaimer']))
    story.append(Spacer(1, 2))
    story.append(Paragraph(
        "Ce guide est fourni à titre informatif et éducatif seulement. Il ne constitue en aucun cas "
        "un conseil financier, fiscal, juridique ou de placement personnalisé. Les chiffres et seuils "
        "mentionnés sont basés sur les données disponibles pour l'année fiscale 2026 et pourraient "
        "changer. Les situations fiscales varient d'une personne à l'autre et d'une province à l'autre. "
        "Consultez un planificateur financier certifié (Pl.\u00a0Fin.) ou un conseiller autorisé avant de "
        "prendre toute décision financière importante.", S['disclaimer']))
    story.append(Spacer(1, 10))
    story.append(Paragraph("© 2026 BuildFi  •  buildfi.ca  •  Tous droits réservés.",
        ParagraphStyle('cr', fontName='Body', fontSize=7, textColor=TEXT_LIGHT, leading=9, alignment=TA_CENTER)))

    doc.build(story)
    return path

if __name__ == "__main__":
    p = build()
    print(f"Generated: {p}")
