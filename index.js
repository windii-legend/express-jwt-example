// パッケージ読み込み
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var mongoose = require('mongoose');

var jwt = require('jsonwebtoken');
var config = require('./config');
var User = require('./app/models/user');

var port = process.env.PORT || 8080;

// MongoDBに接続する
mongoose.connect(config.database, { useNewUrlParser : true});
app.set('secretKey', config.secret);
// body parserの設定
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());

// morganを使ってリクエストをコンソール上に出力できるようにする
app.use(morgan('dev'));

var apiRoutes = express.Router();

// ルートに/apiプレフィックスをつける
app.use('/api', apiRoutes);

// ルート
apiRoutes.get('/healthcheck', function(req, res){
  res.send('hello world!');
});

apiRoutes.get('/signup', function(req, res) {
   var user = new User({
     name: 'サンプルユーザー',
     password: 'password',
   });

   user.save(function(error){
     if(error) {
       throw error;
     }

     console.log('ユーザを作成しました。');
     res.json({ success: true});
   })
});

apiRoutes.post('/login', function(req, res) {

  //　リクエストパラメータから名前を取り出して検索する
  User.findOne({
    name: req.body.name
  }, function(error, user) {

    if (error) throw error;
    if (user) {
      // パスワードが正しいか確認します。
      if (user.password != req.body.password) {
        res.json({ success: false, message: 'パスワードが違います。' });
      } else {

        // ユーザとパスワードの組が正しければトークンを発行します。
        // パスワードはpayloadの中に含めないように注意してください。
        const payload = {
          name : user.name
        };
        var token = jwt.sign(payload, app.get('secretKey'));

        // トークンを返します。
        res.json({
          success: true,
          token: token
        });
      }
    } else {
      res.json({ success: false, message: 'ユーザがいません。' });
    }

  });
});

var VerifyToken = require('./app/middlewares/VerifyToken');

apiRoutes.get('/me', VerifyToken, function(req, res, next) {
  User.findOne({name: req.decoded.name}, {password: 0},
  function (error, user) {

    if (error) return res.status(500).send("ユーザの取得に失敗しました。");
    if (!user) return res.status(404).send("ユーザが見つかりません。");

    res.status(200).send(user);
  });
});

app.listen(port);
console.log('サーバを起動しました。http://localhost:' + port);
