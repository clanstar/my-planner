import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface Todo {
  title: string;
  scheduledDate: string;
  scheduledTime: string;
  isCompleted: boolean;
  actualCompletionTime?: string;
  note?: string;
}

interface DiaryEntry {
  date: string;
  content: string;
}

export const exportDiaryToExcel = (
  diaryEntries: DiaryEntry[], 
  todos: Todo[],
  startDate: string,
  endDate: string
) => {
  // 선택된 기간의 데이터만 필터링
  const filteredDiaryEntries = diaryEntries.filter(
    entry => entry.date >= startDate && entry.date <= endDate
  );

  const filteredTodos = todos.filter(
    todo => todo.scheduledDate >= startDate && todo.scheduledDate <= endDate
  );

  // 날짜별로 데이터 정리
  let excelData: any[] = [];

  filteredDiaryEntries.forEach(entry => {
    const dayTodos = filteredTodos
      .filter(todo => todo.scheduledDate === entry.date)
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    if (dayTodos.length === 0) {
      // 일정이 없는 경우 다이어리 내용만 추가
      excelData.push({
        '날짜': entry.date,
        '일정': '',
        '완료 여부': '',
        '일기': entry.content
      });
    } else {
      // 각 일정별로 행 추가
      dayTodos.forEach(todo => {
        excelData.push({
          '날짜': entry.date,
          '일정': `${todo.title} (${todo.scheduledTime})${todo.note ? ` - ${todo.note}` : ''}`,
          '완료 여부': todo.isCompleted ? 
            `완료 (${todo.actualCompletionTime ? format(new Date(todo.actualCompletionTime), 'HH:mm:ss') : ''})` : 
            '미완료',
          '일기': entry.content
        });
      });
    }
  });

  // 워크북 생성
  const wb = XLSX.utils.book_new();
  
  // 워크시트 생성
  const ws = XLSX.utils.json_to_sheet(excelData, {
    header: ['날짜', '일정', '완료 여부', '일기'],
  });

  // 열 너비 설정
  const columnWidths = [
    { wch: 12 },  // 날짜
    { wch: 40 },  // 일정
    { wch: 20 },  // 완료 여부
    { wch: 60 },  // 일기
  ];
  ws['!cols'] = columnWidths;

  // 워크시트를 워크북에 추가
  XLSX.utils.book_append_sheet(wb, ws, '다이어리');

  // 엑셀 파일 저장
  const fileName = `diary_${startDate}_to_${endDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
};