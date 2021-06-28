// 使用するタスクデータベースのプロパティ名を、使うデータベースに合わせて書き換えること。

const TASK_DB = { 
  dbName: 'Task DB',  
  taskTitle: 'Name',
  deadline: 'Deadline',
  description: 'description',
  staff: 'Assign',
  doneFlag: 'Done',
  gcalUpdatedTime: '_GCal Last Updated Time',
  gcalEventId: '_GCal Event Id',
  gcalCalendarId: 'Calendar',
  needUpdateFlag: '_needGCalUpdate', // checkbox
}

const GCAL_DB = {
  dbName: 'Calendar DB',
  calendarList: 'GCal ID'
}

// Notion API Properties
const NOTION_API_TOKEN_PROPERTY = 'NOTION_API_TOKEN';
const NOTION_API_VERSION = '2021-05-13';

const NOTION_FILTER_CONDITION = {
  equals: 'equals',
  does_not_equal: 'does_not_equal',
  contains: 'contains',
  does_not_contain: 'does_not_contain',
  starts_with: 'starts_with',
  ends_with: 'ends_with',
  is_empty: 'is_empty',
  is_not_empty: 'is_not_empty'
}

const NOTION_FILTER_TYPE = {
  text: 'text',
  number: 'number',
  checkbox: 'checkbox',
  select: 'select',
  multi_select: 'multi_select',
  date: 'date',
  relation: 'relation',
  rich_text: 'text' // richtextプロパティを検索する場合も、フィルターはtextになる
}