/**
 * doCalendarPost
 *    Google Calendar >>> Notion
 *    カレンダーの更新時にトリガーして、探しに行く。
 *    使っているカレンダーすべての更新をトリガーにすること。
 * 
 * @param {event} triggeredEventList - 更新があったカレンダーのイベントリスト
 */
function doCalendarPost(triggeredEventList) {

  const updatedCalendarId = triggeredEventList.calendarId;
  const gcalEventList = new GCalendar(updatedCalendarId);
  const updatedEventList = gcalEventList.events.items.filter(e => {return e.status === 'confirmed'});
  const cancelledEventList = gcalEventList.events.items.filter(e => {return e.status === 'cancelled'});
  if (!(updatedEventList.length > 0 || cancelledEventList.length > 0)) throw 'no updated events.'

  const notionDBList = new NotionDBList(); // NotionDBのうち、更新可能なもの(APIが招待されている)をすべて取得
  const notionDbId = notionDBList.databases[TASK_DB.dbName];
  const calendarDbId = notionDBList.databases[GCAL_DB.dbName];
  const taskDbObj = new NotionDatabase(notionDbId);
  const calendarDbObj = new NotionDatabase(calendarDbId);

  updatedEventList.forEach(event => {

    const targetEventId = event.id;
    let newNotionProps = gcalEventList.convertEventToNotionProps(targetEventId); // gcal更新時刻もここで計算される

    // updateNotion
    const targetNotionPage = taskDbObj.fetchPage(targetEventId, TASK_DB.gcalEventId);
    if (targetNotionPage) {
      const targetNotionPageObj = new NotionPage(notionDbId, targetNotionPage);
      return targetNotionPageObj.update(newNotionProps);
    }

    // createNotion
    const calendarPage = calendarDbObj.fetchPage(updatedCalendarId, GCAL_DB.calendarList);
    newNotionProps[TASK_DB.gcalCalendarId] = NotionProp.relations(calendarPage.id); //set relation property
    const newNotionPage = taskDbObj.createPage(newNotionProps);
    const newNotionPageObj = new NotionPage(notionDbId,newNotionPage);
    gcalEventList.updateEvent(targetEventId, GCalProp.source(newNotionPageObj.pageUrl())); //set Event Source
  });

  cancelledEventList.forEach(event => {

    const targetEventId = event.id;
    const targetNotionPage = taskDbObj.fetchPage(targetEventId, TASK_DB.gcalEventId);
    if (!targetNotionPage) return

    const targetNotionPageObj = new NotionPage(notionDbId, targetNotionPage);    
    let newNotionProps = gcalEventList.convertCancelledEventToNotionProps(targetEventId);
    targetNotionPageObj.update(newNotionProps);

  });

  gcalEventList.setSynctoken(); // 今回のTokenを保存する(次回のScript実行時に利用)

}
