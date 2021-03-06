'use strict';

var services = require('./_services');

services.factory('Board', ['Resource', '$route', '$q', 'Session',
  function (Resource, $route, $q, Session) {
    var board = {};

    board.Rest = Resource('board/:boardId/:writeMode/:writeId/:commentId:controller', {
      boardId: '@boardId',
      writeMode: '@writeMode',
      writeId: '@writeId',
      commentId: '@commentId',
      controller: '@controller'
    }, {
      colist: { method: 'GET', params: { controller: 'colist' } }
    });

    board.list = function (param) {
      var delay = $q.defer();
      var config = { // 기본값
        boardId: $route.current.params.boardId
      };
      var search = Session.search[config.boardId];

      angular.extend(config, param);

      if (search) { // 검색 히스토리
        config.page = config.page || search.page;
        config.search = config.search || search.text;
      }

      board.Rest.get(config, function (result) {
        delay.resolve(result);
      }, function () {
        delay.reject('Execution Error - Board:list');
      });

      return delay.promise;
    };

    board.write = function (writeMode) {
      var delay = $q.defer();

      var writeId = $route.current.params.writeId;

      board.Rest.get({
        boardId: $route.current.params.boardId,
        writeId: writeId || 0,
        writeMode: writeMode || (writeId ? 'u' : 'w')
      }, function (result) {
        delay.resolve(result);
      }, function () {
        delay.reject('Execution Error - Board:write');
      });

      return delay.promise;
    };

    board.initComment = function () {
      return new this.Rest({
        boardId: $route.current.params.boardId,
        writeId: $route.current.params.writeId,
        writeMode: 'c'
      });
    };

    board.listComment = function (param) {
      var delay = $q.defer();

      var config = {
        boardId: $route.current.params.boardId,
        writeId: $route.current.params.writeId,
        writeMode: 'r'
      };
      angular.extend(config, param);

      board.Rest.colist(config, function (result) {
        delay.resolve(result);
      }, function () {
        delay.reject('Execution Error - Board:list');
      });

      return delay.promise;
    };

    return board;
  }
]);
