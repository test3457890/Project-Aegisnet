export interface MockFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
  accessState: string;
}

export const mockFiles: Record<string, MockFile> = {
  "file_1": {
    id: "file_1",
    name: "Road_Trip_Itinerary.pdf",
    size: 2457600,
    type: "application/pdf",
    uploadedBy: "user_sarah",
    uploadedAt: "2026-06-07T16:30:00.000Z",
    accessState: "Shared with Road Trip Group",
  },
  "file_2": {
    id: "file_2",
    name: "Trailhead_Group_Photo.jpg",
    size: 4198400,
    type: "image/jpeg",
    uploadedBy: "user_john",
    uploadedAt: "2026-06-06T10:15:00.000Z",
    accessState: "Shared with Hiking Club Group",
  }
};
