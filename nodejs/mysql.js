// mysql 모듈을 사용한다.
var mysql      = require('mysql');

// connection을 통해서 db유저 정보를 삽입해 db와의 연결을 한다.
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'op'
});

// 생성된 오브젝트를 통해서 실제 실행하는 내용이다
connection.connect();

// connection.query를 통해서 실제 쿼리문을 실행하고 결과값을 반환하는 callback 함수를 이용한다
connection.query('SELECT * FROM topic', function (error, results, fields) {
  if (error) {
    console.log(error);
  }
  console.log(results);
});

// 접속을 종료한다
connection.end();
