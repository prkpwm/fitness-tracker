export const FITNESS_DATA_STRUCTURE = `# Fitness Data API Schema

## Root Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| date | string | ✓ | Entry date (YYYY-MM-DD) |
| last_update | string | | Last modification time (YYYY-MM-DD HH:mm:ss) |
| user_profile | object | ✓ | User profile information |
| food_diary | array | ✓ | Food entries (can be empty) |
| exercise_summary | object | ✓ | Exercise data |
| daily_total_stats | object | ✓ | Daily totals |
| ai_evaluation | object | | AI analysis results |

## user_profile

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| age | number | | User age |
| weight_kg | number | ✓ | Weight in kilograms |
| height_cm | number | ✓ | Height in centimeters |
| goal_calories | number | ✓ | Daily calorie target |
| maintenance_protein_target_g | number | ✓ | Protein target in grams |
| recommended_daily_calories | number | ✓ | Recommended daily intake |
| min_weight_loss_calories | number | ✓ | Minimum calories for weight loss |
| max_weight_loss_calories | number | ✓| Maximum calories for weight loss |

## food_diary[]

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| time | string | | Meal time (เช้า/กลางวัน/เย็น/ดึก) |
| item | string | ✓ | Food description |
| calories | number | ✓ | Calories per serving |
| protein_g | number | ✓ | Protein in grams |
| carbs_g | number | ✓ | Carbohydrates in grams |
| fat_g | number | ✓ | Fat in grams |

## exercise_summary

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| cardio_session_X | object | | Cardio sessions (X = 1,2,3...) |
| strength_training | object | | Strength training session |
| total_burned_calories | number | ✓ | Total exercise calories |

### cardio_session_X

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | ✓ | Exercise type |
| duration_min | number | ✓ | Duration in minutes |
| distance_mi | number | ✓ | Distance in miles |
| calories_burned | number | ✓ | Calories burned |
| avg_hr_bpm | number | | Average heart rate |

### strength_training

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | ✓ | Training type |
| target | string | ✓ | Target muscle groups |
| duration_min | number | ✓ | Duration in minutes |
| calories_burned | number | ✓ | Calories burned |

## daily_total_stats

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| total_intake_calories | number | ✓ | Total food calories |
| total_burned_calories | number | ✓ | Total exercise calories |
| net_calories | number | ✓ | Intake minus burned |
| total_protein_g | number | ✓ | Total protein consumed |
| total_carbs_g | number | ✓ | Total carbs consumed |
| total_fat_g | number | ✓ | Total fat consumed |
| protein_per_kg | number | ✓ | Protein per kg body weight |

## ai_evaluation

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| muscle_maintenance | string | ✓ | Protein adequacy status |
| weight_loss_status | string | ✓ | Calorie deficit status |
| recommendation | string | ✓ | AI advice and feedback |

---

# ตารางอ้างอิงอาหารและขนม (Thai Food Reference)

| ลำดับ | รายการ | หน่วย | พลังงาน (kcal) | น้ำตาล (g) | ไขมัน (g) | หมายเหตุ |
|-------|--------|------|---------------|-----------|-----------|----------|
| 1 | เวเฟอร์ไส้ครีม (EURO) | 1 ห่อ | ~140 | ~7–8 | ~7 | คาร์บ + ไขมัน |
| 2 | ขนมขาไก่/ไก่ทอดกรอบ (Hot & Spicy) | 1 ซอง | ~160 | ~1 | ~10 | โซเดียมสูง |
| 3 | ขนมอบกรอบ (ถุงใหญ่ สีทอง) | 1 หน่วย | ~160 | 11 | 0 | จากฉลาก |
| 4 | นมเปรี้ยว Meiji (สูตรน้ำตาลต่ำ) | 1 ขวด | ~70 | ~4 | ~1 | โปรไบโอติก |
| 5 | ไอศกรีมแท่งวานิลลาเคลือบช็อก | 1 แท่ง | ~200 | ~15 | ~12 | น้ำตาล + ไขมันสูง |
| 6 | เวย์โปรตีน | 1 scoop | 150 | 0 | 0 | โปรตีน ~24 g |
| 7 | เครื่องดื่มชูกำลัง (ขวดเหลือง) | 1 ขวด | 50 | 10 | 0 | น้ำตาลล้วน |
| 8 | ชามะนาวผง (Nestlé) | 1 ซอง | 50 | 5 | 0 | ตามฉลาก |
| 9 | นมเปรี้ยวสูตรน้ำตาลต่ำ (ขวดเขียว) | 1 แก้ว | 30 | 4 | 0 | คุมแคล |

---

# 📋 ตารางรายการอาหารเสริมทั้งหมด (แสดงครบทุกตัว)

## 🧴 1) Gluta Collagen – INZENT (ต่อ 1 เม็ด)

| ส่วนประกอบ | ประเภท | ปริมาณ |
|------------|--------|--------|
| Fish Collagen Dipeptide | Collagen | 350 mg |
| L-Glutathione (100%) | Antioxidant | 250 mg |
| Glycine (100%) | Amino Acid | 100 mg |
| L-Cysteine (100%) | Amino Acid | 100 mg |
| Rice Extract | Herbal | 100 mg |
| Sweet / Blood Orange Extract | Herbal | 50 mg |
| Pomegranate Extract | Herbal | 50 mg |

## 🧴 2) AU NATUREL Multivitamin Multimineral (ต่อ 1 แคปซูล)

| ส่วนประกอบ | ประเภท | ปริมาณ |
|------------|--------|--------|
| Vitamin A | Vitamin | 0.8 mg |
| Vitamin B1 | Vitamin | 0.7 mg |
| Vitamin B2 | Vitamin | 0.75 mg |
| Vitamin B3 (Niacinamide) | Vitamin | 8 mg |
| Vitamin B5 | Vitamin | 2.5 mg |
| Vitamin B6 | Vitamin | 0.8 mg |
| Vitamin B7 (Biotin) | Vitamin | 0.06 mg |
| Vitamin B9 (Folic Acid) | Vitamin | 0.08 mg |
| Vitamin B12 | Vitamin | 0.8 mg |
| Vitamin C | Vitamin | 5 mg |
| Vitamin D3 | Vitamin | 0.8 mg |
| Vitamin E | Vitamin | 10 mg |
| Vitamin K1 | Vitamin | 0.5 mg |
| L-Glutamine | Amino Acid | 50 mg |
| L-Leucine | Amino Acid | 25 mg |
| L-Isoleucine | Amino Acid | 12.5 mg |
| L-Valine | Amino Acid | 12.5 mg |
| Zinc Amino Acid Chelate 20% | Mineral | 25 mg |
| Copper Amino Acid Chelate | Mineral | 6 mg |
| Selenium Amino Acid Chelate | Mineral | 3 mg |
| Magnesium Oxide | Mineral | 45 mg |
| Manganese Chelate | Mineral | 10 mg |
| Calcium Carbonate | Mineral | 350 mg |
| Iron Amino Acid Chelate | Mineral | 10 mg |

## 🧴 3) AU NATUREL Zinc Amino Acid Chelate 20% (ต่อ 1 แคปซูล)

| ส่วนประกอบ | ประเภท | ปริมาณ |
|------------|--------|--------|
| Zinc Amino Acid Chelate 20% | Mineral | 75 mg (ให้ Zinc ~15 mg) |

## 🧴 4) MORTIW – LIVERA 500 mg (ต่อ 1 แคปซูล)

| ส่วนประกอบ | ประเภท | ปริมาณ |
|------------|--------|--------|
| Artichoke Extract | Herbal | 350 mg |
| Dandelion Extract | Herbal | 100 mg |
| L-Methionine | Amino Acid | 30 mg |
| Astragalus Extract | Herbal | 20 mg |

## 🧴 5) SUPURRA (Astaxanthin + CoQ10) (ต่อ 1 แคปซูล)

| ส่วนประกอบ | ประเภท | ปริมาณ |
|------------|--------|--------|
| Hematococcus pluvialis Extract | Antioxidant | 120 mg (ให้ Astaxanthin 6 mg) |
| Coenzyme Q10 | Antioxidant | 20 mg |
| Rose Hips Extract | Herbal | 20 mg |
| Melon Extract | Herbal | 20 mg |
| Vitamin E (DL-alpha-tocopheryl acetate) | Vitamin | 5 mg |

## 🧴 6) L-Arginine Z3A (ต่อ 2 แคปซูล)

| ส่วนประกอบ | ประเภท | ปริมาณ |
|------------|--------|--------|
| L-Arginine HCl | Amino Acid | 1000 mg |
| L-Lysine HCl | Amino Acid | 250 mg |
| L-Ornithine HCl | Amino Acid | 173 mg |
| Zinc Amino Acid Chelate 20% | Mineral | 75 mg (ให้ Zinc ~15 mg) |
| Vitamin B6 | Vitamin | 2 mg |

---

# 🎯 ชุดอาหารเสริมแนะนำ (Recommended Supplement Sets)

## 🅰️ ชุด A (Set A)
- **2) AU NATUREL Multivitamin Multimineral** - 2 เม็ด
- **4) MORTIW – LIVERA 500 mg** - 1 เม็ด  
- **5) SUPURRA (Astaxanthin + CoQ10)** - 1 เม็ด
- **6) L-Arginine Z3A** - 2 เม็ด

## 🅱️ ชุด B (Set B)
- **1) Gluta Collagen – INZENT** - 2 เม็ด

### หมายเหตุ:
- ชุด A เน้นสุขภาพโดยรวม + การออกกำลังกาย (หลังอาหาร)
- ชุด B เน้นความงาม (ท้องว่าง)

`;