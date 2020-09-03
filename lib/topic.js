var db = require('./db.js');
var template = require('./template.js');
var url = require('url');
var qs = require('querystring');

exports.home = function(request,response) {
  db.query('SELECT * FROM topic', function (error, topics) {
      var title = 'Welcome';
      var description = 'Hello, Node.js';
      var list = template.list(topics);
      var html = template.HTML(title, list,
        `<h2>${title}</h2>${description}`,
        `<a href="/create">create</a>`
      );
      response.writeHead(200);
      response.end(html);
  });
}

exports.page = function(request,response) {
  var _url = request.url;
  var queryData = url.parse(_url, true).query;
  db.query('SELECT * FROM topic', function(error, topics){
    if(error) throw error
    db.query(`SELECT * FROM topic, author WHERE topic.author_id = author.id AND topic.id=?`
      , [queryData.id], function(error2, topic){
      if(error2) throw error
          var title = topic[0].title;
          var description = topic[0].description;
          var author = topic[0].name;
          var list = template.list(topics);
          var html = template.HTML(title, list,
            `<h2>${title}</h2>${description}<br>by ${author}`,
            ` <a href="/create">create</a>
              <a href="/update?id=${queryData.id}">update</a>
              <form action="delete_process" method="post">
                <input type="hidden" name="id" value="${queryData.id}">
                <input type="submit" value="delete">
              </form>`
          );
          response.writeHead(200);
          response.end(html);

    });
  });
}

exports.create = function(request,response) {
  db.query('SELECT * FROM topic', function (error, topics) {
    if(error) throw error
      db.query('SELECT * FROM author', function (error2, author) {
        if(error2) throw error2
      var title = 'WEB - create';
      var list = template.list(topics);
      var html = template.HTML(title, list, `
        <form action="/create_process" method="post">
          <p><input type="text" name="title" placeholder="title"></p>
          <p>
            <textarea name="description" placeholder="description"></textarea>
          </p>
          <p>
            ${template.tagSelect(author)}
          </p>
          <p>
            <input type="submit">
          </p>
        </form>
      `, '');
      response.writeHead(200);
      response.end(html);
    });
  });
}

exports.create_process = function(request,response) {
  var body = '';
  request.on('data', function(data){
      body = body + data;
  });
  request.on('end', function(){
      var post = qs.parse(body);
      //  INSERT문을 이용해 create_process를 수행한다. 이때 각 ? 값은
      //  db의 보안을 위해서 []에 있는 값으로 대체하게 하였다. 이렇게 되면,
      // 사용자가 create form을 통해 db 쿼리문을 조작해 발생할 문제를 방지할 수 있다.
      db.query(`INSERT INTO topic (title, description, created, author_id )VALUES (?,?,NOW(),?)`,
      [post.title,post.description,post.author],function(error,topics) {
        if(error) throw error
        // Location을 통한 리다이렉션을 할 때, 우리는 헌재 삽입한 queryData.id를 알 수가 없다. 그래서,
        // result.insertId를 사용하면 삽입된 쿼리문의 PK를 즉시 불러올 수 있게 된다.
        // 자세한 사항은 https://www.npmjs.com/package/mysql#getting-the-id-of-an-inserted-row 에 있다.
        response.writeHead(302, {Location: `/?id=${topics.insertId}`});
        response.end();
    });
  });
}

exports.update = function(request,response) {
  var _url = request.url;
  var queryData = url.parse(_url, true).query;
  db.query('SELECT * FROM topic',function(error,topics){
    if(error) throw error
    db.query(`SELECT * FROM topic WHERE id=?`
      ,[queryData.id],function(error2,topic){
      if(error2) throw error2
       var title = 'Web - update';
       var list = template.list(topics);
       console.log(topic[0]);
       var html = template.HTML(title, list,
        `<form action="/update_process" method="post">
          <input type="hidden" name="id" value="${topic[0].id}">
            <p><input type="text" name="title" placeholder="title" value="${topic[0].title}"></p>
            <p><textarea name="description" placeholder="description">${topic[0].description}</textarea></p>
            <p><input type="submit"></p></form>`,
            `<a href="/create">create</a> <a href="/update?id=${topic[0].id}">update</a>`
           );
           response.writeHead(200);
           response.end(html);
    });
  });
}

exports.update_process = function(request,response) {
  var body = '';
  request.on('data', function(data){
      body = body + data;
  });
  request.on('end', function(){
      var post = qs.parse(body);
      db.query("UPDATE topic SET title=?, description=? WHERE id = ? "
      , [post.title,post.description,post.id,],function(error,topic){
        if(error) throw error;
        response.writeHead(302, {Location: `/?id=${post.id}`});
        response.end();
      });
  });
}

exports.delete_process = function(request,response) {
  var body = '';
  request.on('data', function(data){
      body = body + data;
  });
  request.on('end', function(){
      var post = qs.parse(body);
      db.query("DELETE FROM topic WHERE id = ?",[post.id],function (error,topic) {
        if(error) throw error
        response.writeHead(302,{Location: `/`});
        response.end();
      });
    });
}
