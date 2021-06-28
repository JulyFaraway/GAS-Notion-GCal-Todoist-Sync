/**
 * Notion-GCal sync：
 *    1つのNotion DBに格納されたタスクを、複数のGoogle カレンダーと同期する。
 * 
 * 利用する前に：
 *    DBにinviteしてあるNotion API TOKENを、プロパティ "NOTION_API_TOKEN"に格納すること。
 * 
 * Notion(-GCal)-Todoist 同期の方法：
 *    TodoistでGoogle カレンダーとプロジェクトを同期。
 *    「完了したカレンダーを削除する」をオンにする。
 *    Todoist完了→GCal削除→Notion完了　と連携する。
 * 
 * TODO
 *    Notion完了→(GCal削除→)Todoist完了　の同期は未実装。
 *    カレンダーと同期後、1分以内にすぐNotionDBを操作しても、Updateフラグが立たない。
 */

/**
 * main
 *    Notion >>> Google Calendar
 *    トリガーで定期的に実行して、Notion DBの更新があったらGoogle カレンダーに反映する。
 */
function main(){

  const notionDbList = new NotionDBList();// Notion API Tokenを招待しているすべてのデータベース一覧を取得
  const notionDbId = notionDbList.databases[TASK_DB.dbName];
  const taskDbObj = new NotionDatabase(notionDbId);

  const updatedPageList = taskDbObj.listUpdatedData();
  updatedPageList.forEach(page => {

    let updatedPage = new NotionPage(notionDbId,page);
    let relatedCalId = updatedPage.getPlainText(TASK_DB.gcalCalendarId, GCAL_DB.calendarList);
    let targetGCalObj = new GCalendar(relatedCalId);

    if (!updatedPage.updateStatus) return
    updatedPage.setProp(TASK_DB.gcalUpdatedTime, new Date());
    
    if (updatedPage.updateStatus === 'new'){// createGCal
      const newGCalProps = updatedPage.convertToGCalEvent();
      const createdGCalEventId = targetGCalObj.create(newGCalProps);
      return updatedPage.setProp(TASK_DB.gcalEventId, createdGCalEventId);
    }
    const targetGCalEventId = updatedPage.getPlainText(TASK_DB.gcalEventId);
    
    if(updatedPage.updateStatus === 'updated'){// updateGCal
      const updatedEventParams = updatedPage.convertToGCalEvent();
      return targetGCalObj.updateEvent(targetGCalEventId, updatedEventParams);
    }
    
    if(updatedPage.updateStatus === 'done'){// cancelGcal
      targetGCalObj.cancelEvent(targetGCalEventId);
      return updatedPage.setProp(TASK_DB.gcalEventId, ''); // 再度更新されないように、Notion DBからカレンダーIDを削除
    }
  });

}
