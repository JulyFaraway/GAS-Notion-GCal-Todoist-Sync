/**
 * Google Calendar Class
 */
class GCalendar { // Calendarの下にEvent listがあるので、Eventクラス単体を作るのは効率が悪いと判断

  /**
   * カレンダーIDからイベント（予定）一覧を取得するのに使う
   * 
   * @constructor
   * @param {string} calendarId - 更新されたカレンダーのID
  */
  constructor(calendarId) {
    if(calendarId === null) throw 'calendarId must be provided.';
    this.calendarId = calendarId;
    this.token = this.getSynctoken();
    this.nextSyncToken = this.getNextSynctoken();
    this.events = this.listEvents();
  }

  /**
   * 以前のSyncTokenを発行した後のカレンダー更新を取得
   * items Keyに、更新されたイベントオブジェクト一覧が入っている。
   * see https://developers.google.com/calendar/api/v3/reference/events/list
   */
  listEvents(){
    try{
      const eventList = Calendar.Events.list(this.calendarId,{
        'syncToken': this.token,
        'showDeleted': true // 削除されたイベントも含む。
        }); 
      return eventList;
    } catch (e) {
      console.error('Listing GCal events failed. Fetch threw an exception: ' + e);
    }
  }

  /**
   * GASプロパティから、このカレンダーで使うGoogle Calendar APIの同期トークンを取得する
   */
  getSynctoken(){
    try{
      const token = PropertiesService.getScriptProperties().getProperty(`GCAL_TOKEN_${this.calendarId}`);
      if (token) return token;
      // プロパティにtokenが含まれていないとき、更新されたイベントのnextSyncTokenを返す。
      const events = Calendar.Events.list(this.calendarId, {'timeMin': (new Date()).toISOString()});
      this.nextSyncToken = events.nextSyncToken;
      PropertiesService.getScriptProperties().setProperty(`GCAL_TOKEN_${this.calendarId}`, this.nextSyncToken);
      return this.nextSyncToken;
    } catch (e) {
      console.error('Getting previous synctoken failed. Fetch threw an exception: ' + e);
    }
  }

  /**
   * 現在時刻の、Google Calendar APIの同期トークンを取得する
   */
  getNextSynctoken(){
    try{
      const events = Calendar.Events.list(this.calendarId, {'timeMin': (new Date()).toISOString()});
      this.nextSyncToken = events.nextSyncToken;
      return events.nextSyncToken;
    } catch (e) {
      console.error('Getting next synctoken failed. Fetch threw an exception: ' + e);
    }
  }

  /**
   * GASプロパティの、このカレンダーで使うGoogle Calendar APIの同期トークンを更新する
   */
  setSynctoken(){
    try{
      PropertiesService.getScriptProperties().setProperty(`GCAL_TOKEN_${this.calendarId}`, this.nextSyncToken);
    } catch (e) {
      console.error('Saving next synctoken failed. Fetch threw an exception: ' + e);
    }
  }

  /**
   * Google Calendar イベントのパラメーターを入力して、新規作成したイベントIDを返す。
   * 
   * @param {object} eventparam - 作成するイベントのプロパティ
   * @return {string} createdEvent.id - 作成されたイベントID
   */
  create(eventParam){
    try{
      const createdEvent = Calendar.Events.insert(eventParam, this.calendarId);
      return createdEvent.id;
    }catch (e) {
      console.error('GCal Create Failed. Fetch threw an exception: ' + e);
    }
  }

  /**
   * Google Calendar イベントを更新する
   * 
   * @param {string} eventID - 更新するイベントID
   * @param {object} newEventParams - 更新したいパラメータ
   */
  updateEvent(eventId,newEventParams){
    try {
      // let targetEvent = Calendar.Events.get(this.calendarId,eventId);
      // targetEvent = Object.assign(targetEvent, newEventParam); // 重複したKeyの値のみ置換
      const updateEvent = Calendar.Events.update({
        calendarId: this.calendarId,
        eventId: eventId,
        resource: newEventParams
      });
      return updateEvent.id;
    } catch (e) {
      console.error('GCal Update Failed. Fetch threw an exception: ' + e);
    }
  }

  /**
   * Google Calendar イベントを削除する
   * 
   * @param {string} eventID - 削除するイベントID
   */
  cancelEvent(eventId){
    try {
      Calendar.Events.remove(this.calendarId,eventId); // 成功したらnullが返される
    } catch (e) {
      console.error('GCal Delete Failed. Fetch threw an exception: ' + e);
    }
  }

  getEventProperties(eventId){
    let targetEvent = Calendar.Events.get(this.calendarId,eventId);
    return {
      summary: targetEvent.summary,
      description: targetEvent.description ? targetEvent.description : '',
      date: this.getDateHash(),
    };
  }

  /**
   * Google CalendarイベントをNotionデータプロパティへ変換
   * -summary
   * -start
   * -end
   * -description
   * -id
   * -updatedtime
   * 
   * @param {string} eventId - 変換対象のGoogle カレンダーイベントID
   */
  convertEventToNotionProps(eventId){
    try{
      let targetEvent = Calendar.Events.get(this.calendarId,eventId);
      let properties = {};    
      properties[TASK_DB.taskTitle] = NotionProp.title(targetEvent.summary);
      properties[TASK_DB.deadline] ={'date':this.convertEventDatetoNotionDate(targetEvent)};
      properties[TASK_DB.gcalEventId] = NotionProp.rich_text(targetEvent.id);// Notionに渡すtextは、richtextで定義しないとバグる
      if('description' in targetEvent) properties[TASK_DB.description] = NotionProp.rich_text(targetEvent.description);
      properties[TASK_DB.gcalUpdatedTime] = NotionProp.datetime(new Date());
      return properties;
    }catch(e){
      console.error('Google カレンダーイベントを、Notionタスクに変換できませんでした。エラー：' + e);
    }
  }

  convertEventDatetoNotionDate(eventObject){
    let hash = null;
    if ('dateTime' in eventObject.start){
      hash = {
        "start": eventObject.start.dateTime.replace("T", " "),
        "end": eventObject.end.dateTime.replace("T", " ")
      }
    }
    if ('date' in eventObject.start) {
      hash = {
        "start": eventObject.start.date
      }
    }
    return hash
  }

  convertCancelledEventToNotionProps(eventId){
    try{
      let properties = this.convertEventToNotionProps(eventId);
      properties[TASK_DB.doneFlag] = NotionProp.checkbox(true);
      properties[TASK_DB.gcalEventId] = NotionProp.rich_text('');
      return properties;
    }catch(e){
      console.error('Google カレンダー完了イベントを、Notionタスクに変換できませんでした。エラー：' + e);
    }
  }

}

//TODO
//Google CalendarクラスとGoogle Calendar Eventクラスを分離できるとよいかも

/**
 * Google Calendar APIのカレンダープロパティへ変換するときに使う
 */
class GCalProp{

  static summary(title) {return title;}

  static description(description) {return description;}

  /**
   * "yyyy-mm-dd" 日付のみのイベント
   * 
   * @param {date} start
   * @param {date | null} end
   */
  static date(start, end = null){
    const startDateStringNumber = 0;
    const endDateStringNumber = 10;

    let startAt = new Date(start);
    let endAt = end ? new Date(end) : new Date(start);
    if (this.hasDefaultStartHours) {
      startAt.setHours(this.defaultStartHours); //開始時刻をデフォルトにする
      endAt.setHours(this.defaultStartHours); //終了時刻を開始時刻 + デフォルト所要時間にする
      endAt.setHours(endAt.getHours() + this.defaultEventMinutes);
    }
    let obj = {
      'start': {
        date: startAt.toISOString().substr(startDateStringNumber,endDateStringNumber), // YYYY-MM-DDを切り出す
      },
      'end': {
        date: endAt.toISOString().substr(startDateStringNumber,endDateStringNumber),
      }
    };
    return [obj.start, obj.end];    
  }

  /**
   * 日付＋時刻のあるイベント
   * 
   * @param {date} start
   * @param {date | null} end
   */
  static datetime(start, end = null) {
    let startAt = new Date(start);
    let endAt = end ? new Date(end) : new Date(start);
    let obj = {
      'start': {
        dateTime: startAt.toISOString(),
      },
      'end': {
        dateTime: endAt.toISOString(),
      }
    };
    return [obj.start, obj.end];
  }

  /**
   * Notion pageへのリンク
   * 
   * @param {string} url - Notion page Link
   */
  static source(url){
    let obj = {
      'title': 'Notion Link',
      'url': url
    };
    return obj;
  }

  /**
   * 参加者
   * TODO: 2人以上いるときの処理ができてない
   * 
   * @param {string} emailAddress - 参加者のgmailアドレス
   */
  static attendees(emailAddress){
    let obj = {'attendees':{
      'email' : emailAddress,
      'responseStatus' : 'needsAction'
    }};
    return obj;
  }

}