// Server-side helpers + default templates for Bitable (多维表格) data tables.
// A "table" is stored as a Collection (schema = fields[], views = views[]) and
// its records as CollectionRow.data keyed by field id.

export function bid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// A fresh table: a few representative fields + the four view types.
export function defaultTable(name = "数据表") {
  const fTitle = "fld_title";
  const fStatus = bid("fld");
  const fPriority = bid("fld");
  const fAssignee = bid("fld");
  const fDue = bid("fld");
  const fDone = bid("fld");

  const schema = [
    { id: fTitle, name: "标题", type: "text", primary: true, width: 220 },
    {
      id: fStatus,
      name: "状态",
      type: "select",
      width: 130,
      options: [
        { id: "o1", name: "待办", color: "gray" },
        { id: "o2", name: "进行中", color: "blue" },
        { id: "o3", name: "已完成", color: "green" },
      ],
    },
    {
      id: fPriority,
      name: "优先级",
      type: "select",
      width: 110,
      options: [
        { id: "p1", name: "低", color: "gray" },
        { id: "p2", name: "中", color: "yellow" },
        { id: "p3", name: "高", color: "red" },
      ],
    },
    { id: fAssignee, name: "负责人", type: "person", width: 140 },
    { id: fDue, name: "截止日期", type: "date", width: 140 },
    { id: fDone, name: "完成", type: "checkbox", width: 70 },
  ];

  const views = [
    { id: bid("view"), name: "表格", type: "grid", hiddenFieldIds: [], filters: [], sorts: [] },
    { id: bid("view"), name: "看板", type: "kanban", groupFieldId: fStatus, filters: [], sorts: [] },
    { id: bid("view"), name: "画册", type: "gallery", coverFieldId: null, filters: [], sorts: [] },
    { id: bid("view"), name: "表单", type: "form", filters: [], sorts: [] },
  ];

  const rows = [
    { [fTitle]: "设计多维表格界面", [fStatus]: "o2", [fPriority]: "p3", [fAssignee]: "我", [fDone]: false },
    { [fTitle]: "实现字段类型系统", [fStatus]: "o1", [fPriority]: "p2", [fAssignee]: "我", [fDone]: false },
    { [fTitle]: "接入后端 API", [fStatus]: "o3", [fPriority]: "p2", [fAssignee]: "我", [fDone]: true },
  ];

  return { schema, views, rows };
}
