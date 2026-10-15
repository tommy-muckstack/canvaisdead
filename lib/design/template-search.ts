import { SIZES } from "./ops";
import type { Template } from "./templates";
// Show layouts closest to this canvas first, without stretching preview art.
export function templatesForCanvas(templates: readonly Template[], w: number, h: number, query: string) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const ratio = w > 0 && h > 0 ? w / h : 1;
  const distance = (template: Template) => {
    const size = SIZES.find(item => item.id === template.size);
    return size ? Math.abs(Math.log(size.w / size.h / ratio)) : Infinity;
  };
  return templates.filter(template => {
    const text = `${template.name} ${template.category}`.toLocaleLowerCase();
    return words.every(word => text.includes(word));
  }).sort((a, b) => distance(a) - distance(b));
}
