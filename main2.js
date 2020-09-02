/*
이 내용에서는 기존의 파일에서 불러왔던 if(pathname === '/'){ 다음 부분들을
mysql 쿼리문을 통해서 처리하게 변경한다.
*/

var http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');
var template = require('./lib/template.js');
var path = require('path');
var sanitizeHtml = require('sanitize-html');
// mysql 모듈을 사용한다
var mysql = require('mysql');

var db = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'op'
});
db.connect();


var app = http.createServer(function(request,response){
    var _url = request.url;
    var queryData = url.parse(_url, true).query;
    var pathname = url.parse(_url, true).pathname;
    if(pathname === '/'){
      if(queryData.id === undefined){
        db.query('SELECT * FROM topic', function (error, topics) {
            var title = 'Welcome';
            var description = 'Hello, Node.js';
            /* fs.readdir를 사용할 때는 list() 내부에 filelist를 넘겨주었다
            그러나, 우리는 반환된 db 쿼리를 넘겨주면 된다.
            단 /lib/template.js에서는 topics[i] 부분을 변경해줘야 한다.
            /lib/template.js의 topics[i]를 그대로 출력할 경우 topics[i]자체인 오브젝트가 반환된다.

            topics[i]의 프로퍼티를 접근하기 위해 topics[i].title 과 같은 방식으로 접근해주면 된다.
            Q. 왜 topics[i].title 같은 방식인가요?
            A. topics 자체는 하나의 배열로 이루어져있다.
               그리고 그 배열 내부 하나하나(topics[i])에는 객체가 담겨있다.
               그리고 해당 객체의 프로퍼티를 가져오기 위해서는 .을 통해 접근한다.

               topics 전체가 배열로 이루어져 있기 때문에 /lib/template.js에서
               topics.length와 topics[i]을 이용한 배열식 접근 방식이 가능하다.

            */
            var list = template.list(topics);
            var html = template.HTML(title, list,
              `<h2>${title}</h2>${description}`,
              `<a href="/create">create</a>`
            );
            response.writeHead(200);
            response.end(html);
        });
      } else {
        // 현재 이 쿼리는 template.list 생성을 위한 쿼리문이다.
        db.query('SELECT * FROM topic', function(error, topics){
          if(error) throw error
          // 현재 이 쿼리는 queryData.id에 맞게 url이 변경될 때마다 해당 queryData.id를 가진
          // 쿼리문을 가져와 title과 description을 출력해주는 역할을 한다.

          // id=? 사용하면 쿼리문에 queryData.id를 직접 삽입하지 않고, ?를 대체할 내용을
          // 배열의 형태로 전달하게 된다. 이렇게 되면, 사용자가 url을 통해 db 쿼리문을 조작해 발생할
          // 문제를 방지할 수 있다. (기존에는 WHERE id= ${queryData.id} 였다)
          db.query(`SELECT * FROM topic WHERE id=?`, [queryData.id], function(error2, topic){
            if(error2) throw error
                var title = topic[0].title;
                var description = topic[0].description;
                var list = template.list(topics);
                var html = template.HTML(title, list,
                  `<h2>${title}</h2>${description}`,
                  ` <a href="/create">create</a>
                    <a href="/update?id=${queryData.id}">update</a>
                    <form action="delete_process" method="post">
                      <input type="hidden" name="id" value="${queryData.id}">
                      <input type="submit" value="delete">
                    </form>`
                );
                response.writeHead(200);
                response.end(html);

          })
        })
      }
    } else if(pathname === '/create'){
      db.query('SELECT * FROM topic', function (error, topics) {
          var title = 'WEB - create';
          var list = template.list(topics);
          var html = template.HTML(title, list, `
            <form action="/create_process" method="post">
              <p><input type="text" name="title" placeholder="title"></p>
              <p>
                <textarea name="description" placeholder="description"></textarea>
              </p>
              <p>
                <input type="submit">
              </p>
            </form>
          `, '');
          response.writeHead(200);
          response.end(html);
      });
    } else if(pathname === '/create_process'){
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
          [post.title,post.description,1],function(error,topics) {
            if(error) throw error
            // Location을 통한 리다이렉션을 할 때, 우리는 헌재 삽입한 queryData.id를 알 수가 없다. 그래서,
            // result.insertId를 사용하면 삽입된 쿼리문의 PK를 즉시 불러올 수 있게 된다.
            // 자세한 사항은 https://www.npmjs.com/package/mysql#getting-the-id-of-an-inserted-row 에 있다.
            response.writeHead(302, {Location: `/?id=${topics.insertId}`});
            response.end();
          });
      });
    } else if(pathname === '/update'){
      db.query('SELECT * FROM topic',function(error,topics){
        if(error) throw error
        db.query('SELECT * FROM topic WHERE id=?',[queryData.id],function(error2,topic){
          if(error2) throw error2
           var title = 'Web - update';
           var list = template.list(topics);
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
    } else if(pathname === '/update_process'){
      var body = '';
      request.on('data', function(data){
          body = body + data;
      });
      request.on('end', function(){
          var post = qs.parse(body);
          var id = post.id;
          var title = post.title;
          var description = post.description;
          db.query("UPDATE topic SET title=?, description=? WHERE id = ? author_id = ?", [post.title,post.description,post.id,1],function(error,topic){
            if(error) throw error;
            response.writeHead(302, {Location: `/?id=${post.id}`});
            response.end();
          });
      });
    } else if(pathname === '/delete_process'){
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
    } else {
      response.writeHead(404);
      response.end('Not found');
    }
});
app.listen(3000);
