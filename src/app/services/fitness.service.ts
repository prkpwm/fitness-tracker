import { Injectable } from '@angular/core';
import { type HttpClient } from '@angular/common/http';
import { type Observable } from 'rxjs';
import { type FitnessData } from '../models/fitness.model';

@Injectable({
  providedIn: 'root'
})
export class FitnessService {
  private apiUrl = 'http://localhost:8080/api/fitness';

  constructor(private http: HttpClient) { }

  getFitnessData(): Observable<FitnessData[]> {
    return this.http.get<FitnessData[]>(this.apiUrl);
  }

  createFitnessData(data: FitnessData): Observable<FitnessData> {
    return this.http.post<FitnessData>(this.apiUrl, data);
  }

  getFitnessDataByDate(date: string): Observable<FitnessData> {
    return this.http.get<FitnessData>(`${this.apiUrl}/${date}`);
  }
}