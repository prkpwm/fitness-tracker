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

  private async checkAndAddSampleData(): Promise<void> {
    const allData = await this.getAllRecords();
    if (allData.length === 0) {
      const sampleData: FitnessData = {
        date: "2025-12-31",
        user_profile: {
          weight_kg: 85,
          height_cm: 173,
          goal_calories: 1500,
          maintenance_protein_target_g: 120
        },
        food_diary: [
          { item: "นมเปรี้ยวผสมโปรตีน", calories: 150, protein_g: 15, carbs_g: 0 },
          { item: "เมี่ยงกุ้งลวก", calories: 345, protein_g: 29, carbs_g: 44 },
          { item: "90% Extra Dark Chocolate", calories: 60, protein_g: 0.5, carbs_g: 2 },
          { item: "สเต็กเนื้อ/หมูย่าง", calories: 500, protein_g: 45, carbs_g: 0 },
          { item: "ขนมปังปิ้งเนย (1 แผ่น)", calories: 120, protein_g: 2.5, carbs_g: 15 },
          { item: "นมเปรี้ยวดีไลท์ (0.5 ขวด)", calories: 38, protein_g: 2.5, carbs_g: 6 },
          { item: "ส้มสายน้ำผึ้ง (3 ลูก)", calories: 135, protein_g: 2, carbs_g: 33 }
        ],
        exercise: {
          cardio: {
            type: "Treadmill Running",
            distance_mi: 6.2,
            duration_min: 91,
            calories_burned: 498
          },
          strength_training: {
            target_area: "Core / Abs (ลำตัว)",
            duration_min: 30,
            calories_burned: 150,
            intensity: "Moderate"
          },
          total_burned_calories: 648
        },
        daily_summary: {
          total_intake_calories: 1348,
          total_burned_calories: 648,
          net_calories: 700,
          total_protein_g: 96.5,
          total_carbs_g: 100,
          status: "Extreme Deficit - Need more Protein for Muscle Maintenance"
        }
      };
      
      await this.saveData(sampleData);
    }
  }
}