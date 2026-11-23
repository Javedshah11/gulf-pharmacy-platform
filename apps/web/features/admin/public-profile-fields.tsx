'use client';
import { useRef, useState } from 'react';
import type { Branch, OpeningPeriod } from '@gulf/shared';
import { useAdmin, useText } from './provider';
import { Field } from './ui';
import { weekDays } from '@/features/localization/dictionaries';
const textFields = [
  'contactNameEn',
  'contactNameAr',
  'postalCode',
  'descriptionEn',
  'descriptionAr',
] as const;
export function publicProfileChanges(
  form: FormData,
  branch: Branch,
  superAdmin: boolean,
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  for (const field of textFields) {
    const value = String(form.get(field) ?? '').trim();
    if (value !== (branch[field] ?? '')) changes[field] = value;
  }
  if (superAdmin) {
    const published = form.has('isPublished');
    if (published !== branch.isPublished) changes.isPublished = published;
    const openingHours: OpeningPeriod[] = form
      .getAll('openingDays')
      .map((day) => ({
        day: Number(day),
        opens: String(form.get('opens-' + day)),
        closes: String(form.get('closes-' + day)),
      }));
    if (
      JSON.stringify(openingHours) !== JSON.stringify(branch.openingHours ?? [])
    )
      changes.openingHours = openingHours;
    const ar = form.getAll('serviceAr');
    const services = form.getAll('serviceEn').map((en, index) => ({
      nameEn: String(en).trim(),
      nameAr: String(ar[index]).trim(),
    }));
    if (JSON.stringify(services) !== JSON.stringify(branch.services ?? []))
      changes.services = services;
  }
  return changes;
}
export function PublicProfileFields({
  branch,
  superAdmin,
}: {
  branch: Branch;
  superAdmin: boolean;
}) {
  const t = useText();
  const { locale } = useAdmin();
  const [days, setDays] = useState(() =>
    (branch.openingHours ?? []).map((period) => period.day),
  );
  const [services, setServices] = useState(() =>
    (branch.services ?? []).map((service, key) => ({ ...service, key })),
  );
  const nextKey = useRef(services.length);
  return (
    <section className="admin-public-fields">
      <h2>{t('Public branch profile', 'البيانات العامة للفرع')}</h2>
      <p>
        {t(
          'Use verified business information only. Leave unknown details empty.',
          'أدخلوا المعلومات التجارية المؤكدة فقط، واتركوا التفاصيل غير المعروفة فارغة.',
        )}
      </p>
      <div className="admin-form-grid">
        <Field
          label={t('Branch contact · English', 'للتواصل مع الفرع · الإنجليزية')}
        >
          <input
            name="contactNameEn"
            defaultValue={branch.contactNameEn ?? ''}
            maxLength={160}
          />
        </Field>
        <Field
          label={t('Branch contact · Arabic', 'للتواصل مع الفرع · العربية')}
        >
          <input
            name="contactNameAr"
            defaultValue={branch.contactNameAr ?? ''}
            maxLength={160}
            dir="rtl"
          />
        </Field>
        <Field label={t('Postal code', 'الرمز البريدي')}>
          <input
            name="postalCode"
            defaultValue={branch.postalCode ?? ''}
            maxLength={20}
            dir="ltr"
          />
        </Field>
        <Field label={t('Description · English', 'الوصف · الإنجليزية')}>
          <textarea
            name="descriptionEn"
            defaultValue={branch.descriptionEn ?? ''}
            maxLength={2000}
            rows={4}
            dir="ltr"
          />
        </Field>
        <Field label={t('Description · Arabic', 'الوصف · العربية')}>
          <textarea
            name="descriptionAr"
            defaultValue={branch.descriptionAr ?? ''}
            maxLength={2000}
            rows={4}
            dir="rtl"
          />
        </Field>
      </div>
      {superAdmin ? (
        <>
          <fieldset className="admin-checks">
            <legend>{t('Publication', 'النشر')}</legend>
            <label>
              <input
                type="checkbox"
                name="isPublished"
                defaultChecked={branch.isPublished}
              />
              {t(
                'Publish this branch on the public website',
                'نشر هذا الفرع على الموقع العام',
              )}
            </label>
          </fieldset>
          <h3>{t('Verified opening hours', 'ساعات العمل المؤكدة')}</h3>
          <p className="admin-help">
            {t(
              'Select only confirmed days. Times use the branch’s local time (Saudi Arabia). An earlier closing time means the following day. Remove a day to omit its hours; this does not assert the branch is closed.',
              'اختاروا الأيام المؤكدة فقط. الأوقات بتوقيت الفرع المحلي في السعودية. وقت الإغلاق الأسبق يعني اليوم التالي. حذف يوم يخفي ساعاته ولا يعني أن الفرع مغلق.',
            )}
          </p>
          <div className="admin-hours-editor">
            {weekDays[locale].map((day, index) => {
              const period = branch.openingHours?.find(
                (period) => period.day === index,
              );
              return (
                <div key={index}>
                  <label>
                    <input
                      type="checkbox"
                      name="openingDays"
                      value={index}
                      checked={days.includes(index)}
                      onChange={(event) =>
                        setDays((previous) =>
                          event.target.checked
                            ? [...previous, index]
                            : previous.filter((day) => day !== index),
                        )
                      }
                    />
                    {day}
                  </label>
                  <Field label={t('Opens', 'الافتتاح') + ' · ' + day}>
                    <input
                      type="time"
                      name={'opens-' + index}
                      defaultValue={period?.opens ?? ''}
                      disabled={!days.includes(index)}
                      required={days.includes(index)}
                    />
                  </Field>
                  <Field label={t('Closes', 'الإغلاق') + ' · ' + day}>
                    <input
                      type="time"
                      name={'closes-' + index}
                      defaultValue={period?.closes ?? ''}
                      disabled={!days.includes(index)}
                      required={days.includes(index)}
                    />
                  </Field>
                </div>
              );
            })}
          </div>
          <h3>{t('Approved services', 'الخدمات المعتمدة')}</h3>
          <p className="admin-help">
            {t(
              'Add only services documented for this branch. Both language names are required. Do not infer delivery, inventory, or clinical services.',
              'أضيفوا الخدمات الموثقة لهذا الفرع فقط. الاسم بالعربية والإنجليزية مطلوب. لا تفترضوا توفر التوصيل أو المخزون أو الخدمات السريرية.',
            )}
          </p>
          {services.map((service) => (
            <div className="admin-service-editor" key={service.key}>
              <Field label={t('Service · English', 'الخدمة · الإنجليزية')}>
                <input
                  name="serviceEn"
                  defaultValue={service.nameEn}
                  required
                  maxLength={160}
                  dir="ltr"
                />
              </Field>
              <Field label={t('Service · Arabic', 'الخدمة · العربية')}>
                <input
                  name="serviceAr"
                  defaultValue={service.nameAr}
                  required
                  maxLength={160}
                  dir="rtl"
                />
              </Field>
              <button
                className="admin-text-button"
                type="button"
                onClick={() =>
                  setServices((previous) =>
                    previous.filter((row) => row.key !== service.key),
                  )
                }
              >
                {t('Remove service', 'حذف الخدمة')}
              </button>
            </div>
          ))}
          <button
            className="admin-button secondary"
            type="button"
            disabled={services.length >= 12}
            onClick={() =>
              setServices((previous) => [
                ...previous,
                { nameEn: '', nameAr: '', key: nextKey.current++ },
              ])
            }
          >
            {t('Add verified service', 'إضافة خدمة مؤكدة')}
          </button>
        </>
      ) : (
        <p className="admin-help">
          {t(
            'Publication, verified opening hours, and approved services are managed by the Super Admin.',
            'يدير المسؤول العام النشر وساعات العمل المؤكدة والخدمات المعتمدة.',
          )}
        </p>
      )}
    </section>
  );
}
