export function scrollToThought(element,y){if(!element)return;element.scrollTo({top:Math.max(0,y-64),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
