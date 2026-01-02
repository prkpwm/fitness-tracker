import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FitnessData } from '../models/fitness.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'https://fitness-tracker-backend-9qi5.onrender.com/api';

  constructor(private http: HttpClient) {}

  getFitnessDataByYear(year: number): Observable<FitnessData[]> {
    return this.http.get<FitnessData[]>(`${this.baseUrl}/fitness/year/${year}`);
  }

  getFitnessDataByMonth(year: number, month: number): Observable<FitnessData[]> {
    const monthStr = String(month).padStart(2, '0');
    return this.http.get<FitnessData[]>(`${this.baseUrl}/fitness/year/${year}/month/${monthStr}`);
  }

  getAllFitnessData(): Observable<FitnessData[]> {
    return this.http.get<FitnessData[]>(`${this.baseUrl}/fitness`);
  }

  getFitnessDataByDate(date: string): Observable<FitnessData> {
    return this.http.get<FitnessData>(`${this.baseUrl}/fitness/${date}`);
  }

  createFitnessData(data: FitnessData): Observable<FitnessData> {
    return this.http.post<FitnessData>(`${this.baseUrl}/fitness`, data);
  }
}