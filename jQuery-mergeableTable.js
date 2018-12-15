;(function(){

    function buildStyle(opts) {
        var $style = $('#mgStyle');
        if ($style.length === 0) {
            // 构建样式表节点
            $style = $('<style type="text/css" rel="stylesheet" id="mgStyle">');

            // 样式表：单元格高亮背景颜色，右键菜单高亮颜色
            var cellColor = opts.cellColor || '#2D93CA';
            var menuColor = opts.menuColor || '#6681B0';
            $style.text('.mg_selected{background:'+cellColor+'}.mg_menu:hover{background:'+menuColor+'}');

            // 样式表添加到head中
            $style.appendTo($('head')[0]);
        }
    }

    /**
     * 插件对象
     * @constructor
     */
    function MergeableTable() {

        // 保存合并历史，用于撤销操作
        this.history = [];

        // 右键菜单
        this.menuId = 'ctxMenu_' + Date.now();
        this.$menu = null;

        this.init();
    }

    MergeableTable.prototype.init = function() {
        var self = this;

        // 坐标矩阵
        self.matrix = {
            start: {x: -1, y: -1},
            end: {x: -1, y: -1}
        };

        // 当前单元格
        self.currentCell = null;

        // 合并方向
        self.direction = null;
    };

    /**
     * 点击单元格北京高亮显示
     */
    MergeableTable.prototype.doHighlight = function(td) {

        var $td = $(td), $tr = $td.parent(), col = $td.index(), row = $tr.index();

        var self = this, evt = window.event;
        if (!evt || evt.shiftKey !== true) {
            // 取消高亮
            self.undoHighlight();

            // 保存起始坐标
            self.matrix.start.x = row;
            self.matrix.start.y = col;

            // 切换样式
            $td.toggleClass('mg_selected');

            // 取消选中初始化起始坐标
            if (!$td.hasClass('mg_selected')) {
                self.matrix.start.x = -1;
                self.matrix.start.y = -1;
            }
        } else {

            // 起始坐标
            var sx = self.matrix.start.x;
            var sy = self.matrix.start.y;

            // 保存结束坐标
            var ex = self.matrix.end.x = row;
            var ey = self.matrix.end.y = col;

            // 非连续选择
            if (sx !== ex && sy !== ey) {
                lib.alertWarn('请选择连续的行或列！');
                return;
            }

            // 取消高亮行
            self.undoHighlight();

            // 同一行
            if (sx === ex) {
                self.direction = 'row';
                $tr.find('td').each(function(i, td){
                    if (i >= Math.min(sy, ey) && i <= Math.max(sy, ey)) {
                        $(td).addClass('mg_selected');
                    }
                })
            }

            // 同一列
            if (sy === ey) {
                self.direction = 'col';
                $tr.parent().find('tr').each(function(i, tr){
                    if (i >= Math.min(sx, ex) && i <= Math.max(sx, ex)) {
                        $(tr).find('td').eq(sy).addClass('mg_selected');
                    }
                })
            }
        }
    };

    /**
     * 取消高亮显示
     */
    MergeableTable.prototype.undoHighlight = function($tds) {
        $tds = $tds || $(this.currentCell).parent().parent();
        $tds.find('.mg_selected').removeClass('mg_selected');
    };

    /**
     * 构建右键菜单
     * @returns {*|jQuery|HTMLElement}
     */
    MergeableTable.prototype.buildMenu = function() {
        var self = this;

        // 构建右键菜单
        var $menu = $('#'+self.menuId);
        if ($menu.length === 0) {
            $menu = $('<ul id="'+self.menuId+'" class="mg_menus"></ul>');
            $menu.html($('<li class="mg_menu">合并单元格</li>').css({cursor: 'pointer',padding: '5px 10px'}));
            $menu.css({
                position:'absolute',
                zIndex:10,
                background:'#FFF',
                border:'1px solid #CCC',
                listStyle: 'none',
                padding: 0,
                display: 'none'
            }).appendTo('body');
        }

        return $menu;
    };

    /**
     * 显示右键菜单
     */
    MergeableTable.prototype.showMenu = function(evt) {
        var self = this;

        // 当前选择单元格
        self.currentCell = evt.target;

        // 缓存菜单节点
        self.$menu = self.buildMenu();

        // 右键菜单定位显示
        self.$menu.css({top: evt.pageY, left: evt.pageX}).show();
    };

    /**
     * 隐藏右键菜单
     */
    MergeableTable.prototype.hideMenu = function() {
        if (this.$menu !== null) {
            this.$menu.hide();
        }
    };

    /**
     * 合并单元格
     */
    MergeableTable.prototype.doMerge = function() {

        var self = this, $currentRow = $(self.currentCell).parent(), $tds, idx;
        if (self.matrix.start.x === -1) {
            lib.alertWarn('请选择要合并的单元格！');
            return;
        }

        if (self.matrix.end.x === -1) {
            lib.alertWarn('请选择多个连续单元格！');
            return;
        }

        lib.alertConfirm('合并单元格时，仅保留左上角的值，而放弃其他值', '警告', function(){
            // 合并行
            if (self.direction === 'row') {
                $tds = $currentRow.find('.mg_selected');
                $tds.each(function(i){
                    if (i === 0) {
                        $(this).attr('colspan', $tds.length)
                    } else {
                        $(this).hide();
                    }
                });
                // 记录
                self.history.push({dir: self.direction, tds: $tds});

                // 隐藏菜单
                self.hideMenu();

                // 去除高亮行
                self.undoHighlight();

                // 初始数据
                self.init();
            }

            // 合并列
            if (self.direction === 'col') {

                $tds = $currentRow.parent().find('.mg_selected');
                $.each($tds, function(i){
                    if (i === 0) {
                        $(this).attr('rowspan', $tds.length)
                    } else {
                        $(this).hide();
                    }
                });
                // 记录
                self.history.push({dir: self.direction, tds: $tds});

                // 隐藏菜单
                self.hideMenu();

                // 去除高亮行
                self.undoHighlight();

                // 初始数据
                self.init();
            }

            return true;
        });
    };

    /**
     * 取消合并单元格
     */
    MergeableTable.prototype.undoMerge = function() {
        var his = this.history.pop();
        if (his) {
            his.tds.each(function(i){
                var flag = i === 0;
                if (his.cell) {
                    flag = this === his.cell;
                }
                if (flag) {
                    $(this).attr(his.dir === 'row' ? 'colspan' : 'rowspan', 1)
                } else {
                    $(this).show();
                }
            })
        }
    };

    $.fn.mergeable = function(options) {
        options = options || {};

        // 添加必要样式
        buildStyle(options);

        return this.each(function(){
            var el = this, $el = $(el);

            el._mergeable = new MergeableTable();

            /**
             * 点击高亮显示，并记录起始结束单元格坐标
             */
            $el.on('click', 'td,.td', function() {
                el._mergeable.doHighlight(this);
            });

            // 右键菜单
            $el.contextmenu(function(e){
                e.preventDefault();
                el._mergeable.showMenu(e);
            });

            /**
             * 点击右键菜单
             */
            $(document).on('click', '.mg_menu', function() {
                el._mergeable.doMerge();
            });

            /**
             * 隐藏右键菜单
             */
            $(document).on('click', function() {
                el._mergeable.hideMenu();
                el._mergeable.undoHighlight($el.find('.mg_selected'));
            });

            /**
             * 撤销操作
             */
            $(document).on('keyup', function(e) {
                var evt = window.event ? event : e;
                if (evt.keyCode === 90 && evt.ctrlKey) {
                    el._mergeable.undoMerge();
                }
            });
        });
    };
})();
