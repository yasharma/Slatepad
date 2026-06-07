import { EMPTY_DOC_STRING } from "./types";

export interface NoteTemplate {
  id: string;
  name: string;
  icon: string;
  title: string;
  content: string;
  tags: string;
}

const dailyTasksContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Today" }],
    },
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Top priority" }] }],
        },
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Second task" }] }],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Notes" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Add context or links here." }],
    },
  ],
};

const meetingNotesContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", marks: [{ type: "bold" }], text: "Date: " },
        { type: "text", text: " " },
      ],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", marks: [{ type: "bold" }], text: "Attendees: " },
        { type: "text", text: " " },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Agenda" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Topic 1" }] }],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Notes" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: " " }],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Action items" }],
    },
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Follow up" }] }],
        },
      ],
    },
  ],
};

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "blank",
    name: "Blank note",
    icon: "📄",
    title: "Untitled",
    content: EMPTY_DOC_STRING,
    tags: "",
  },
  {
    id: "daily-tasks",
    name: "Daily Tasks",
    icon: "✅",
    title: "Daily Tasks",
    content: JSON.stringify(dailyTasksContent),
    tags: "work",
  },
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    icon: "📝",
    title: "Meeting Notes",
    content: JSON.stringify(meetingNotesContent),
    tags: "meetings",
  },
];

export function getTemplate(id: string): NoteTemplate | undefined {
  return NOTE_TEMPLATES.find((t) => t.id === id);
}
