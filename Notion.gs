/**
 * Notion Class
 */
class NotionDBList {

  /** 
   * Used to access Notion Database List Notion API invited
   * @constructor
  */
  constructor() {
    this.secret = PropertiesService.getScriptProperties().getProperty(NOTION_API_TOKEN_PROPERTY);
    this.databases = this.listDatabases();
  }

  listDatabases() {
    try{
      const url = "https://api.notion.com/v1/search";
      const response = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',    
        muteHttpExceptions: true,
        headers: {
          Authorization: `Bearer ${this.secret}`,
          "Notion-Version": NOTION_API_VERSION
        },
        payload: JSON.stringify({
          filter: {
            value: 'database',
            property: 'object'
          }
        })
      });
      const { results = [] } = JSON.parse(response.getContentText());
      const databases = results
        .map(({ id, title: [{ plain_text: title }] }) => ({ id, title })) // title object >> plain text
        .reduce( (obj, db) => {obj[db.title] = db.id; return obj;}, {} );
      return databases;
    }catch(ex){
      console.error("Message: " + ex.message + "\r\nFile: " + ex.fileName + "\r\nLine: " + ex.lineNumber + "\r\n");
    }
  }

}

class NotionPayload{

  setParent(databaseId){
    return this.parent={
        database_id : databaseId
    };
  }

  setProperties(propertiesObject){
    return this.properties = propertiesObject;
  }

  setFilter(filterObject){
    return this.filter = filterObject;
  }

  setPageSize(page_size){
    if (Math.sign(page_size) < 0) throw 'invalid page size.'
    return this.page_size = page_size;
  }

}

class NotionDatabase{

  /**
   * @constructor
   */
  constructor(database_id){
    if (!database_id) throw 'database id must be provided.'
    this.secret = PropertiesService.getScriptProperties().getProperty(NOTION_API_TOKEN_PROPERTY);
    this.headers = this.setApiHeader(this.secret, NOTION_API_VERSION);
    this.databaseId = database_id;
    this.propertyList = this.listProperties();
    this.propertyTypeList = this.listPropertiesTypes();
    this.maxQuerySize = 100;
    this.minQuerySize = 1;
    this.minPageNumber = 0;
  }

  /** 
   * setApiHeader
   *    Request headerを設定する
   * 
   * @param {string} secret - The secret to access your internal integration, see https://www.notion.so/my-integrations
   * @param {string} version - Notion-Version
   * @return {object} - fetch header
  */
  setApiHeader(secret,version){
    return {
      Authorization: `Bearer ${secret}`,
      'Notion-Version': version
    };
  } 

  listProperties(){
    const firstPage = this.queryPage().shift();
    if (!firstPage) throw "couldn't query page."
    return firstPage.properties;
  }

  /**
   * listProperties
   *    Notion Databaseに含まれるプロパティの名前とtype一覧を返す
   * 
   * @return {objects} properties
   */
  listPropertiesTypes(){
    const firstPage = this.queryPage().shift();
    if (!firstPage) throw "couldn't query page."
    const propertyList = Object.assign(...Object.keys(firstPage.properties).map(key => ({[key]:firstPage.properties[key].type})));
    return propertyList;
  }

  /**
   * existsPropertyName
   *    Notion Databaseに対象のプロパティ名が含まれているかを判定する
   * 
   * @param {string} propName
   * @return {boolean}
   */
  existsPropertyName(propName){
    return this.properties[propName];
  }

  /**
   * getPage
   *    特定のpage idをもつNotion Pageオブジェクトを返す
   * 
   * @param {string} page_id - 対象のページID
   * @return {NotionPage Object}
   */
  getPage(page_id) {   
    try{
      const url = this.makePagesUrl(page_id);
      const option = this.makeApiOption('GET');
      const response = UrlFetchApp.fetch(url, option);
      return JSON.parse(response.getContentText());
    }catch(ex){
      console.error("Message: " + ex.message + "\r\nFile: " + ex.fileName + "\r\nLine: " + ex.lineNumber + "\r\n");
    }
  }

  queryPage(filter, page_size) {
    try{
      const payload = new NotionPayload();
      if(filter) payload.setFilter(filter);
      if(page_size > 0) payload.setPageSize(page_size);
      const url = this.makeQueryUrl(this.databaseId);
      const option =  this.makeApiOption('POST',payload);
      const response = UrlFetchApp.fetch(url, option);
      const {results = []} = JSON.parse(response.getContentText());
      return results;
    }catch(ex){
      console.error("Message: " + ex.message + "\r\nFile: " + ex.fileName + "\r\nLine: " + ex.lineNumber + "\r\n");
    }
  }

  /**
   * fetchPage
   *    特定のプロパティ値を持つページのうち、最も新しいものを1つだけ返す
   * 
   * @param {string|number|date|boolean} targetValue - 検索に使う値
   * @param {string} targetPropName - 検索に使う値が格納されているプロパティの名前
   * @return {object|undefined} - 見つからなければundefined
   */
  fetchPage(targetValue, targetPropName){
    try{
      const targetPropType = this.propertyTypeList[targetPropName];
      const response = this.queryPage(
        NotionFilterSet.propEquals(targetPropName,targetPropType,targetValue),
        this.minQuerySize
      );
      return response[this.minPageNumber];
    }catch(ex){
      console.error("Message: " + ex.message + "\r\nFile: " + ex.fileName + "\r\nLine: " + ex.lineNumber + "\r\n");
    }
  }

  /**
   * createPage
   *    Notion Databaseに、新ページを作成する
   *    see https://developers.notion.com/reference/page#page-property-value
   * 
   * @param {Array of NotionPageProp} properties - 新しいページのプロパティ
   */
  createPage(properties) {
    try{
      let payload = new NotionPayload();
      payload.setParent(this.databaseId);
      payload.setProperties(properties);

      const url = this.makePagesUrl();
      const option =  this.makeApiOption('POST',payload);
      const response = UrlFetchApp.fetch(url, option);
      return JSON.parse(response.getContentText());
    }catch(ex){
      console.error("Message: " + ex.message + "\r\nFile: " + ex.fileName + "\r\nLine: " + ex.lineNumber + "\r\n");
    }
  }

  /** 
   * Make request Option
   * 
   * @param {objct} payload
   * @param {string} method
  */
  makeApiOption(method = 'POST', payload) {
    let option = {
      method: method,
      contentType: 'application/json',    
      muteHttpExceptions: true,
      headers: this.headers,
    }
    if (payload) {option.payload = JSON.stringify(payload);}
    return option;
  }

  makeSearchUrl(pageId = ''){
      return 'https://api.notion.com/v1' + pageId + '/search';
  }

  makeQueryUrl(){
      return 'https://api.notion.com/v1/databases/' + this.databaseId +'/query';
  }

  makePagesUrl(pageId = ''){
    return 'https://api.notion.com/v1' + '/pages/' + pageId;
  }

  /** 
   * Notion APIのDatabase objectが複数格納される. 
   * see https://developers.notion.com/reference/database
   * 
   * @param {string} databaseName - アップデートされたデータを検索しに行くNotionデータベース名
   * @return {object} updatedLists - 前回の探索から更新されたページの一覧
   */
  listUpdatedData(){
    const needCreateGCalFilter = NotionFilter.and(
      NotionFilterSet.hasTaskTitle(true),
      NotionFilterSet.hasDeadline(true),
      NotionFilterSet.isdone(false),
      NotionFilterSet.hasGCalEventId(false),
      NotionFilterSet.hasGCalCalendarId(true),
    );
    const needUpdateGCalFilter = NotionFilter.and(
      NotionFilterSet.hasTaskTitle(true),
      NotionFilterSet.hasDeadline(true),
      NotionFilterSet.isdone(false),
      NotionFilterSet.hasGCalEventId(true),
      NotionFilterSet.hasGCalCalendarId(true),
      NotionFilterSet.isLaterUpdatedThanGCal(true),
    );
    const needCancelGCalFilter = NotionFilter.and(
      NotionFilterSet.hasTaskTitle(true),
      NotionFilterSet.hasDeadline(true),
      NotionFilterSet.isdone(true),
      NotionFilterSet.hasGCalEventId(true),
      NotionFilterSet.hasGCalCalendarId(true),
      NotionFilterSet.isLaterUpdatedThanGCal(true),
    );
    const updateDataFilter = NotionFilter.or(needCreateGCalFilter, needUpdateGCalFilter, needCancelGCalFilter);// up to 2 nesting levels deep.
    try{
      return this.queryPage(updateDataFilter, this.maxQuerySize);
    }catch(e){
      let message = "ここでエラーが起きるのは、DBの名前を間違えたときが多い。 global_variable.gsを確認してください。"
      message += e;
      console.error(message);
    }
  }
  //TODO
  // propertyNamesから、フィルター一覧を作成
  // makeFilters(userPropertyNames)
  // NotionFilterSetをDatabaseごとに作る
  // Propertyは、名前とタイプの照応が必要
  // 名前だけ入れたら、タイプはproperty.typeを持ってくる
  // Namelistが全部propertyに存在するかチェックする関数（falseならエラーを吐いて、更新を開始しない）
}

class NotionPage {

  /**
   * Notion ページの変更や更新
   * see https://developers.notion.com/reference/page
   * 
   * @constructor
   * @param {string} parent_database_id - Notion page's parent DB id
   * @param {object} page - Notion Page Object
   */  
  constructor(parent_database_id, page){
    if(!parent_database_id || !page) throw 'both parent-DB id and page object required.'
    this.parentDb = new NotionDatabase(parent_database_id);
    this.properties = this.parentDb.listProperties(); // page objectが値を持たないproperty keyを設定するために、親DBのproperty一覧を一度引っ張る
    this.properties =Object.assign(this.properties, page.properties);
    this.id = page.id;
    this.lastEditedTime = page.last_edited_time;
    this.parentDbId = page.parent.database_id;
    return this.updateStatus = this.getUpdateStatus();
  }

  setProp(propName, propValue){
    let targetProperty = this.properties[propName];
    let propType = targetProperty.type;
    //TODO 'date' 'datetime'に関してはNotionPropクラスの方で例外処理したほうがいい
    if(propType==='date' && propValue.getHours()) propType = 'datetime'
    const newProperty = {
      [propName]: NotionProp[propType](propValue)
    };
    this.update(newProperty);
  }

  update(properties) {
    try{
      let payload = new NotionPayload();
      payload.setProperties(properties);      
      const url = this.parentDb.makePagesUrl(this.id);
      const option = this.parentDb.makeApiOption('PATCH', payload)
      const response = UrlFetchApp.fetch(url, option);
      return JSON.parse(response.getContentText());
    }catch(ex){
      console.error("Message: " + ex.message + "\r\nFile: " + ex.fileName + "\r\nLine: " + ex.lineNumber + "\r\n");
    }
  }

  /**
   * Notion Dataが、Google カレンダーへどう同期すべきかのフラグを返す。
   * 
   * @return {string} - 同期フラグ
   */
  getUpdateStatus(){ // title,date, GCalIDはemptyではない前提
    if(this.isEmptyProp[TASK_DB.gcalCalendarId]) throw 'missing Calendar ID.'
    if(!this.isDone() && this.hasGCalEventId() && !this.needGCalUpdate()) return 'new';
    if(!this.isDone() && this.hasGCalEventId() && this.needGCalUpdate()) return 'update';
    if(this.isDone() && this.hasGCalEventId() && this.needGCalUpdate()) return 'done';
  }

  isDone(){
    return this.properties[TASK_DB.doneFlag].checkbox; // true or false
  }

  needGCalUpdate(){
    return this.properties[TASK_DB.needUpdateFlag].formula.boolean; // true or false
  }

  hasGCalEventId(){
    return this.isEmptyProp(TASK_DB.gcalEventId) === false;
  }

  hasGCalendarId(){
    return this.isEmptyProp(TASK_DB.gcalCalendarId) === false;
  }

  isEmptyProp(propName){
    if (!(propName in this.properties)) throw 'invalid property Name.';
    return !(this.properties[propName]);
  }

  /**
  * propertyタイプごとに場合分けして、プレーンテキストを返す
  */ 
  getPlainText(propName, relatedDBProp){
    try{
      if (!(propName in this.properties) && !relatedDBProp) throw 'invalid property name.';
      let proptype = this.properties[propName].type;

      if(proptype === 'text') {
        return this.properties[propName].text.content;
      }

      if(proptype === 'title') {
        return this.properties[propName].title[0].text.content;
      }

      if(proptype === 'rich_text') {
        if (this.properties[propName].rich_text.length == 0) return '';
        return this.properties[propName].rich_text[0].plain_text;
      }

      if(proptype === 'relation') { // relation先のDataBaseから値を値を参照
        const relatedPropertyName = this.relatedPageId(propName);
        const relatedPage = this.parentDb.getPage(relatedPropertyName);
        return relatedPage.properties[relatedDBProp].rich_text[0].plain_text;
      }

      throw 'invalid property type.';
    }catch(e){
      console.error(e);
    }
  }

  /**
   * Notion Pageのリレーションプロパティ名を入れると、リレーション先のNotionページIDを返す。
   * e.g. 引数に"TASK_DB.gcalCalendarId"を入れると、relationのカレンダーIDが拾える
   * 
   * @param {string} propName -relationプロパティ名
   * @return {string} relatedPageId -relation先のNotionページID
   */
  relatedPageId(propName){
    if (!propName in this.properties) throw 'invalid property name.'
    return this.properties[propName].relation[0].id;
  }

  convertToGCalEvent(){
    if(this.isEmptyProp(TASK_DB.deadline)) throw 'Date property must be provided.'
    let properties = {};
    try{  
        properties.summary = GCalProp.summary(this.getPlainText(TASK_DB.taskTitle));
        properties.description = GCalProp.description(this.getPlainText(TASK_DB.description));
        properties.source = GCalProp.source(this.pageUrl());

        // TODO 参加者複数時の処理ができないため、attendeesは同期しない
        // properties.attendees = GCalProp.attendees(notionprops[TASK_DB.staff].email);

        const startDate = this.properties[TASK_DB.deadline].date.start;
        const endDate = this.hasEndTime(TASK_DB.deadline) ? this.properties[TASK_DB.deadline].date.end : null;
        [properties.start, properties.end] = this.hasDateOnly(TASK_DB.deadline) ? GCalProp.date(startDate, endDate) : GCalProp.datetime(startDate, endDate);
      return properties;
    }catch(e){
      console.error('NotionページをGoogle Calendarイベントに変換できませんでした。エラー：' + e);
    }
  }

  hasDateOnly(propName){
    if (this.properties[propName].type !== 'date') throw 'Date property must be provided.';
    const dateNumber = 10;// YYYY-MM-DDで10文字
    return this.properties[propName].date.start.length === dateNumber;
  }

  /**
   * Notionの日付プロパティを入れると、終了日時があるか判定
   * 
   * @param{NotionDateProperty} propName - Notionの日付プロパティの名前
   */
  hasEndTime(propName){
    if (this.properties[propName].type !== 'date') throw 'Date property must be provided.';
    return (this.properties[propName].date.end) ? true : false;
  }

  /**
   * NotionのPageIDを、アクセス可能なURLに変換
   * 
   * @param {object} page - notion page
   */
  pageUrl(){
    const urlId = this.id.replace(/\-/g, '');
    return `https://www.notion.so/${urlId}`;
  }
}

/**
 * Wrappers to create or update property values
 * https://developers.notion.com/reference/page#page-property-value
 */
class NotionProp {

  static date(start, end = null) {
    const dateString = "YYYY-MM-dd";
    let obj = {
      'date': {
        start: Utilities.formatDate(start, Session.getScriptTimeZone(), dateString)
      }
    };
    if(end != null) {
      obj.date.end = Utilities.formatDate(end, Session.getScriptTimeZone(), dateString)
    }
    return obj;
  }

  static datetime(start, end = null) {
    const datetimeString = "yyyy-MM-dd'T'HH:mm:ss.SSSXXX";
    let obj = {
      'date': {
        start: Utilities.formatDate(start, Session.getScriptTimeZone(), datetimeString)
      }
    };
    if(end != null) {
      obj.date.end = Utilities.formatDate(end, Session.getScriptTimeZone(), datetimeString)
    }
    return obj;
  }

  static title(content) {
    return {
        title: [NotionProp.text(content)]
    }
  }

  static text(content) {
    return { 
      text: {
        content: content
      }
    }
  };

  //todo 複数ある場合は処理できていない
  static rich_text(content){
    return {
        rich_text:[{
          text:{
            content:content
          }
        },]
    }
  }

  static relations(...ids) {
    let obj = {
      relation: []
    };
    for(let i = 0; i < ids.length; i++) {
      obj.relation.push({
        id: ids[i]
      });
    }
    return obj;
  }

  static checkbox(boolean) {
    return {
      checkbox: boolean
    }
  }

  static url(address) {
    return {
      url: address
    }
  }

  static email(address) {
    return {
      email: address
    }
  }

}

class NotionFilterSet{

  //TODO
  //filter typeが噛み合ってないときのエラー処理ができていない

  static isdone(boolean){
    return NotionFilter.filter(TASK_DB.doneFlag, NOTION_FILTER_TYPE.checkbox, NOTION_FILTER_CONDITION.equals, boolean)
  }

  static hasTaskTitle(boolean){// is_empty | is_not_empty must be true
    let filterCondition = boolean? 'is_not_empty' : 'is_empty';
    return NotionFilter.filter(TASK_DB.taskTitle, NOTION_FILTER_TYPE.text, NOTION_FILTER_CONDITION[filterCondition], true)
  }

  static hasDeadline(boolean){// is_empty | is_not_empty must be true
    let filterCondition = boolean? 'is_not_empty' : 'is_empty';
    return NotionFilter.filter(TASK_DB.deadline, NOTION_FILTER_TYPE.date, NOTION_FILTER_CONDITION[filterCondition], true)
  }

  static hasGCalEventId(boolean){// is_empty | is_not_empty must be true
    let filterCondition = boolean? 'is_not_empty' : 'is_empty';
    return NotionFilter.filter(TASK_DB.gcalEventId, NOTION_FILTER_TYPE.text, NOTION_FILTER_CONDITION[filterCondition], true)
  }

  static hasGCalCalendarId(boolean){// is_empty | is_not_empty must be true
    let filterCondition = boolean? 'is_not_empty' : 'is_empty';
    return NotionFilter.filter(TASK_DB.gcalCalendarId, NOTION_FILTER_TYPE.relation, NOTION_FILTER_CONDITION[filterCondition], true)
  }

  static isLaterUpdatedThanGCal(boolean){
    return NotionFilter.filter(TASK_DB.needUpdateFlag, NOTION_FILTER_TYPE.checkbox, NOTION_FILTER_CONDITION.equals, boolean)
  }

  static titleIs(title){
    return NotionFilter.filter(TASK_DB.taskTitle, NOTION_FILTER_TYPE.text, NOTION_FILTER_CONDITION.equals, title)
  }

  static propEquals(propName,propType,propValue){
    return NotionFilter.filter(propName, NOTION_FILTER_TYPE[propType], NOTION_FILTER_CONDITION.equals, propValue)
  }

  static isNotEmpty(propName, propType){
    return NotionFilter.filter(propName, NOTION_FILTER_TYPE[propType], NOTION_FILTER_CONDITION.is_not_empty, true)
  }

}

class NotionFilter {

  /**
   * Create a Notion query filter object.
   * See https://developers.notion.com/reference/post-database-query#post-database-query-filter
   * 
   * @param {string} property
   * @param {NOTION_FILTER_TYPE} type
   * @param {NOTION_FILTER_CONDITION} condition
   * @param {*} value 
   * @return {object}
   */
  static filter(property, type, condition, value) {
    let obj = {
      property: property
    };
    obj[type] = {};
    obj[type][condition] = value;
    return obj;
  }

  static and(...filters) {
    let obj = {
      and: []
    };
    for(let i = 0; i < filters.length; i++) {
      obj.and.push(filters[i]);
    }
    return obj;
  }

  static or(...filters) {
    let obj = {
      or: []
    };
    for(let i = 0; i < filters.length; i++) {
      obj.or.push(filters[i]);
    }
    return obj;
  }

}

