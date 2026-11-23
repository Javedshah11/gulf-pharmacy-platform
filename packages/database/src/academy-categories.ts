export const academyCategories = [
  ['general-health', 'General Health', 'الصحة العامة'],
  ['medicine-safety', 'Medicine Safety', 'سلامة الأدوية'],
  ['first-aid', 'First Aid', 'الإسعافات الأولية'],
  ['nutrition-wellness', 'Nutrition and Wellness', 'التغذية والعافية'],
  ['skin-care', 'Skin Care Education', 'التوعية بالعناية بالبشرة'],
  ['seasonal-health', 'Seasonal Health', 'الصحة الموسمية'],
  ['preventive-health', 'Preventive Health', 'الصحة الوقائية'],
  ['family-health', 'Family Health', 'صحة الأسرة'],
].map(([slug, titleEn, titleAr], sortOrder) => ({
  slug,
  titleEn,
  titleAr,
  sortOrder,
}));
