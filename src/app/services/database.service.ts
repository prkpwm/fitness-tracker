import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { FitnessData } from '../models/fitness.model';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private dbName = 'FitnessTrackerDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor(private http: HttpClient) {
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.checkAndAddSampleData();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('fitness_data')) {
          const store = db.createObjectStore('fitness_data', { keyPath: 'date' });
          store.createIndex('date', 'date', { unique: true });
        }
      };
    });
  }

  getFitnessDataByDate(date: string): Observable<FitnessData> {
    return from(this.getDataByDate(date));
  }

  createFitnessData(data: FitnessData): Observable<FitnessData> {
    return from(this.saveData(data));
  }

  // Debug method to view all data
  getFitnessDataByYear(year: number): Observable<FitnessData[]> {
    return from(this.getDataByYear(year));
  }

  getFitnessDataByMonth(year: number, month: number): Observable<FitnessData[]> {
    return from(this.getDataByMonth(year, month));
  }

  getAllData(): Observable<FitnessData[]> {
    return from(this.getAllRecords());
  }

  getRawJsonFromDB(date: string): Observable<string> {
    return from(this.getDataByDate(date).then(data => JSON.stringify(data, null, 2)));
  }

  private async getDataByDate(date: string): Promise<FitnessData> {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['fitness_data'], 'readonly');
      const store = transaction.objectStore('fitness_data');
      const request = store.get(date);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          reject(new Error('No data found'));
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async saveData(data: FitnessData): Promise<FitnessData> {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['fitness_data'], 'readwrite');
      const store = transaction.objectStore('fitness_data');
      const request = store.put(data);

      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  private async getAllRecords(): Promise<FitnessData[]> {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['fitness_data'], 'readonly');
      const store = transaction.objectStore('fitness_data');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getDataByYear(year: number): Promise<FitnessData[]> {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['fitness_data'], 'readonly');
      const store = transaction.objectStore('fitness_data');
      const request = store.getAll();

      request.onsuccess = () => {
        const allData = request.result as FitnessData[];
        const yearData = allData.filter(data => data.date.startsWith(year.toString()));
        resolve(yearData);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async getDataByMonth(year: number, month: number): Promise<FitnessData[]> {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['fitness_data'], 'readonly');
      const store = transaction.objectStore('fitness_data');
      const request = store.getAll();

      request.onsuccess = () => {
        const allData = request.result as FitnessData[];
        const monthStr = String(month).padStart(2, '0');
        const prefix = `${year}-${monthStr}`;
        const monthData = allData.filter(data => data.date.startsWith(prefix));
        resolve(monthData);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async checkAndAddSampleData(): Promise<void> {
    // Clear existing data to force new structure
    const allData = await this.getAllRecords();
    if (allData.length > 0) {
      // Clear the database to update structure
      const transaction = this.db!.transaction(['fitness_data'], 'readwrite');
      const store = transaction.objectStore('fitness_data');
      await new Promise<void>((resolve) => {
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => resolve();
      });
    }
    
    const sampleData: FitnessData = {
      date: "2025-12-31",
      user_profile: {
        weight_kg: 85,
        height_cm: 173,
        goal_calories: 1500,
        maintenance_protein_target_g: 120
      },
      food_diary: [
        { item: "นมเปรี้ยวผสมโปรตีน", calories: 150, protein_g: 15, carbs_g: 0, fat_g: 0 },
        { item: "เมี่ยงกุ้งลวก (กุ้ง 12 ตัว + เส้นหมี่)", calories: 345, protein_g: 29, carbs_g: 44, fat_g: 5 },
        { item: "90% Extra Dark Chocolate", calories: 60, protein_g: 0.5, carbs_g: 2, fat_g: 5 },
        { item: "สเต็กเนื้อ/หมูย่าง (2 ชิ้นใหญ่)", calories: 500, protein_g: 45, carbs_g: 0, fat_g: 40 },
        { item: "ขนมปังปิ้งเนย (1 แผ่น)", calories: 120, protein_g: 2.5, carbs_g: 15, fat_g: 6 },
        { item: "นมเปรี้ยวดีไลท์ (1 ขวด - แบ่งทาน)", calories: 76, protein_g: 5, carbs_g: 12, fat_g: 0 },
        { item: "ส้มสายน้ำผึ้ง (3 ลูก)", calories: 135, protein_g: 2, carbs_g: 33, fat_g: 0 },
        { item: "เวย์โปรตีน (3 สกู๊ป)", calories: 120, protein_g: 24, carbs_g: 3, fat_g: 1.5 },
        { item: "คั่วไข่ 3 ฟอง (ไม่ใส่น้ำมัน)", calories: 220, protein_g: 21, carbs_g: 3.5, fat_g: 15 },
        { item: "เบียร์สิงห์ (1 กระป๋องยาว 490 มล.)", calories: 210, protein_g: 0, carbs_g: 15, fat_g: 0 }
      ],
      exercise_summary: {
        cardio_session_1: { type: "Treadmill Running", distance_mi: 6.2, duration_min: 91, calories_burned: 498 },
        cardio_session_2: { type: "Treadmill Running", distance_mi: 3.79, duration_min: 60, calories_burned: 356 },
        strength_training: { target: "Core/Abs", duration_min: 30, calories_burned: 150 },
        total_burned_calories: 1004
      },
      daily_total_stats: {
        total_intake_calories: 1886,
        total_burned_calories: 1004,
        net_calories: 882,
        total_protein_g: 144.0,
        total_carbs_g: 129.5,
        total_fat_g: 72.5,
        protein_per_kg: 1.69
      },
      ai_evaluation: {
        muscle_maintenance: "Excellent (Exceeded 120g target)",
        weight_loss_status: "Highly Active Deficit",
        recommendation: "High recovery needed. Increase water intake due to alcohol and intense cardio."
      }
    };
    
    await this.saveData(sampleData);
  }
}