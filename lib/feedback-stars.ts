// /lib/feedback-stars.ts
// Star rating HTML block injected into reports — static <a> links, no JS needed
// RTL trick: DOM order 5→1 with direction:rtl displays as 1→5.
// CSS :hover~sibling highlights all stars up to the hovered one.

export function buildStarRatingBlock(feedbackToken: string, fr: boolean): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.buildfi.ca";

  let h = '<style>'
    + '.bf-star{display:inline-block;font-size:32px;color:#d4cec4;text-decoration:none;'
    + 'transition:color .15s;cursor:pointer;padding:0 4px;line-height:1}'
    + '.bf-star:hover,.bf-star:hover~.bf-star{color:#c49a1a}'
    + '</style>';
  h += '<div style="text-align:center;padding:28px 0;border-top:1px solid #e8e4db;margin:20px 0 28px" class="no-print">';
  h += '<div style="font-size:14px;color:#1a1208;font-weight:600;margin-bottom:14px">';
  h += fr ? "Comment \u00e9valuez-vous ce rapport\u00a0?" : "How would you rate this report?";
  h += '</div>';
  h += '<div style="display:inline-flex;direction:rtl">';
  for (let i = 5; i >= 1; i--) {
    h += '<a href="' + baseUrl + '/api/feedback?token=' + feedbackToken + '&rating=' + i
      + '" class="bf-star">&#9733;</a>';
  }
  h += '</div>';
  h += '<div style="font-size:11px;color:#999;margin-top:10px">';
  h += fr ? "Votre avis nous aide \u00e0 am\u00e9liorer buildfi.ca" : "Your feedback helps us improve buildfi.ca";
  h += '</div></div>';
  return h;
}
