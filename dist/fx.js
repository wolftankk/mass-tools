//=========================================
// 特效模块
//==========================================
dom.define("fx", "css",function(){
    //  dom.log("已加载fx模块");
    var global = this, DOC = global.document, types = {
        color:/color/i,
        transform:/rotate|scaleX|scaleY|translateX|translateY/i,
        scroll:/scroll/i,
        _default:/fontSize|fontWeight|opacity|width|height|top$|bottom$|left$|right$/i
    },
    rfxnum = /^([+\-/\*]=)?([\d+.\-]+)([a-z%]*)$/i;
    var adapter = dom.fxAdapter = {
        _default:{
            get:function(el, prop) {
                return dom.css(el,prop);
            },
            tween :function(form,change,name,per) {
                var a = (form + change * dom.easing[name](per)).toFixed(3);
                return isNaN(a) ? 0 : a;
            }
        },
        type:function (attr){
            for(var i in types){
                if(types[i].test(attr)){
                    return i;
                }
            }
            return "_default";
        }
    }

    var tween = adapter._default.tween;
    dom.mix(adapter,{
        scroll : {
            get: function(el, prop){
                return el[prop];
            },
            tween: tween
        },
        transform:{
            get: function(el, prop){
                return dom.transform(el)[prop]
            },
            set:function(el,t2d,isEnd,per){
                var obj = {}
   
                for(var name in t2d){
                    obj[name] = isEnd ? t2d[name][1] : tween(t2d[name][0],t2d[name][2],t2d[name][3],per); 
                }
                dom.transform(el,obj);
            }
        },
        color : {
            get:function(el,prop){
                return  dom.css(el,prop);
            },
            tween:function(f0,f1,f2,c0,c1,c2,name,per,i){
                var delta = dom.easing[name](per), ret = [];
                for(i = 0;i < 3;i++){
                    ret[i] = Math.max(Math.min((arguments[i] +arguments[i+3] * delta)|0, 255), 0);
                }
                return "rgb("+ret+")";
            }
        }
    } );
    //中央定时器，可以添加新节点到中央列队，然后通过setInterval方法不断调用nextTick处理所有节点的动画
    function heartbeat( node) {
        heartbeat.nodes.push( node);
        if (heartbeat.id === null) {//如果浏览器支持JIT，那么把间隔设小点，让动画更加流畅
            heartbeat.id = setInterval(nextTick, 16);//开始心跳
        }
        return true;
    }
    heartbeat.nodes = []; //中央列队
    heartbeat.id = null;  //原始的setInterval id
    //驱动中央列队的元素节点执行它们的动画，如果执行完毕就把它们从列队中剔除，如果列队为空则中止心跳
    function nextTick() {
        var nodes = heartbeat.nodes, i = 0, n = nodes.length;
        for (; i < n; i++) {
            if (animate(nodes[i]) === false) {//在这里操作元素的样式或属性进行渐变
                nodes.splice(i, 1);
                i -= 1;
                n -= 1;
            }
        }
        nodes.length || (clearInterval(heartbeat.id), heartbeat.id = null);
    }
        
    var shortcuts = {
        c:          "color",
        h:          "height",
        o:          "opacity",
        r:          "rotate",
        w:          "width",
        x:          "left",
        y:          "top",
        fs:         "fontSize",
        st:       "scrollTop",
        sl:       "scrollLeft",
        sx:         "scaleX",      
        sy:         "scaleY",     
        tx:         "translateX",  
        ty:         "translateY",   
        bgc:        "backgroundColor"
    }
    var callbacks = dom.oneObject("before,after");
    var keyworks  = dom.oneObject("easing,reverse,chain,back");
    //处理特效的入口函数,用于将第二个参数，拆分为两个对象props与config，然后再为每个匹配的元素指定一个双向列队对象fxs
    //fxs对象包含两个列队，每个列队装载着不同的特效对象
    dom.fn.fx = function(duration, hash){
        var props = hash ||{}, config = {};
        if(typeof duration === "funciton"){
            props.after = duration
            duration = null;
        }
        for(var name in props){
            if(name in callbacks){
                config[name] = [].concat(props[name]);
                delete props[name]
            }else if(name in keyworks){
                config[name] = props[name];
                delete props[name];
            }else if(name in shortcuts){
                props[shortcuts[name]] = props[name];
                delete props[name];
            }
        }

        var easing = (config.easing || "swing").toLowerCase() ;
        config.easing = dom.easing[easing] ? easing : "swing";
        config.duration = duration || 500;
        config.type = "noop";
           
        return this.each(function(node){
            var fxs = dom._data(node,"fx") || dom._data( node,"fx",{
                artery:[], //正向列队
                vein:  [], //负向列队
                run: false 
            });
            fxs.artery.push({//fx对象
                startTime:  0,//timestamp
                isEnd:     false,
                config:   dom.mix({}, config),//各种配置
                props:    dom.mix({}, props)//用于渐变的属性
            });
            if(!fxs.run){
                fxs.run = heartbeat( node);
            }
        });
    }
    function eventInterceptor(mix, node, fx, back) {
        var array = dom.isArray(mix) ? mix : [mix], i = 0, n = array.length;
        for (; i < n; ++i) {
            array[i](node, fx.props, fx, back);
        }
    }
    function animate(node) {//fxs对象类似Deferred，包含两个列队（artery与vein）
        var fxs = dom._data( node,"fx") ,interceptor = eventInterceptor, fx = fxs.artery[0],
        back, now, isEnd, mix;
        if( isFinite(fx)){ 
            setTimeout(function(){
                fxs.artery.shift();
                fxs.run = heartbeat( node);
            },fx)
            return (fx.run = false)
        }
        if (!fx) { //这里应该用正向列队的长度做判定
            fxs.run = false;
        } else {
            var config = fx.config;
            back = !!config.back;
            if (fx.startTime) { // 如果已设置开始时间，说明动画已开始
                now = +new Date;
                switch(fxs.stopCode){
                    case 0:
                        fx.render = dom.noop;//中断当前动画，继续下一个动画
                        break;
                    case 1:
                        fx.gotoEnd = true;//立即跳到最后一帧，继续下一个动画   
                        break;
                    case 2:
                        fxs.artery  = fxs.vein = [];//中断全部动画
                        break;
                    case 3:
                        for(var ii=0,_fx;_fx=fxs.artery[ii++];){
                            _fx.gotoEnd = true;//立即完成全部动画
                        }   
                        break;
                }
                delete fxs.stopCode;

            } else { // 初始化动画
                mix = config.before;
                mix && (interceptor(mix, node, fx, back), config.before = 0);
                fx.render = fxBuilder(node, fxs, fx.props, config); // 创建渲染函数
                dom[config.type]([node], fx.props, fx)
                fx.startTime = now = +new Date;
            }
            isEnd = fx.gotoEnd || (now >= fx.startTime + config.duration);
            //node, 是否结束, 进度
            fx.render(node, isEnd, (now - fx.startTime)/config.duration); // 处理渐变
            if(fx.render === dom.noop) {//立即开始下一个动画
                fxs.artery.shift();
            }
            if (isEnd) {
    
                if(config.type == "hide"){
                    for(var i in config.orig){//还原为初始状态
                        dom.css(node,i,config.orig[i])
                    }
                }
                fxs.artery.shift(); // remove current queue
                mix = config.after;
                mix && interceptor(mix, node, fx, back);
                
                if (!config.back && config.reverse && fxs.vein.length) {
                    fxs.artery = fxs.vein.reverse().concat(fxs.artery); // inject reverse queue
                    fxs.vein = []; // clear reverse qeueue
                }
                if (!fxs.artery.length) {
                    fxs.run = false;
                }
            }
        }
        return fxs.run; // 调用 clearInterval方法，中止定时器
    }
    var rspecialVal = /show|toggle|hide/;
    function fxBuilder(node, fxs, props, config){//用于分解属性包中的样式或属性,变成可以计算的因子
        var ret = "var style = node.style,t2d = {}, adapter = dom.fxAdapter , _defaultTween = adapter._default.tween;",
        reverseConfig = dom.Object.merge.call( {},config),
        transfromChanged = 0,
        reverseProps = {};
        reverseConfig.back =  1;
        var orig = config.orig = {}
        for(var p in props){
            var name = dom.cssCache(p);//将属性名转换为驼峰风格
            var val =  props[name] = props[p];//取得结束值
            if(val == undefined){
                continue;
            }
            var easing = config.easing;//公共缓动公式
            var type = dom.fxAdapter.type(name);
            var adapter = dom.fxAdapter[type];
            var from = adapter.get(node,name);
            if(rspecialVal.test(val) ){//如果值为show hide toggle
                if(val == "show" || (val == "toggle" && dom._isHide(node))){
                    val = dom._data(node,"old"+name) || from;
                    config.type = "show"
                    from = 0;
                }else {//hide
                    orig[name] =  dom._data(node,"old"+name,from);
                    config.type = "hide"
                    val = 0;
                }
            }else if(Array.isArray(val)){
                var arr = val;
                val = arr[0];//取得第一个值
                easing = arr[1] || easing;//取得第二个值或默认值
            }
            //开始分解结束值to
            if(type != "color" ){//如果不是颜色，则需判定其有没有单位以及起止值单位不一致的情况
                var parts = rfxnum.exec( val) ,op = (parts[1]||"").charAt(0),
                to = parseFloat( parts[2]|| 0 ),//确保to为数字
                unit = parts[3] || (dom.cssNumber[ name ] ?  "" : "px"); 
                from = from == "auto" ? 0 : parseFloat(from)//确保from为数字
                if ((op == "+" || op == "-") && unit && unit !== "px" ) {
                    dom.css(node, name, (to || 1) + unit);
                    from = ((to || 1) / parseFloat(dom.css(node,name))) * from;
                    dom.css( node, name, from + unit);
                }
                if(op){//处理+=,-= \= *=
                    to = eval(from+op+to);
                }
                var change = to - from;
            }else{
                from = color2array(from);
                to   = color2array(val);
                change = to.map(function(end,i){
                    return end - from[i]
                });
            }
            if(from +"" === to +""){//不处理初止值都一样的样式与属性      
                continue;
            }
            var hash = {
                name:name,
                to:to,
                type:type,
                from:from ,
                change:change,
                easing:easing,
                unit:unit
            };
            switch(type){
                case "_default":
                    if(name == "opacity" && !dom.support.cssOpacity){
                        ret += dom.format('dom.css(node,"opacity", (isEnd ? #{to} : _defaultTween(#{from},#{change},"#{easing}", per )));;',hash);
                    }else{
                        ret += dom.format('style.#{name} = ((isEnd ? #{to} : _defaultTween(#{from}, #{change},"#{easing}",per )))+"#{unit}";',hash);
                    }
                    break;
                case "scroll":
                    ret += dom.format('node.#{name} = (isEnd ? #{to}: _defaultTween(#{from}, #{change},"#{easing}",per ));',hash);
                    break;
                case "color":
                    ret += dom.format('style.#{name} = (isEnd ? "rgb(#{to})" : adapter.#{type}.tween(#{from}, #{change},"#{easing}",per));',hash);
                    break;
                case "transform":
                    transfromChanged++
                    ret +=  dom.format('t2d.#{name} = [#{from},#{to}, #{change},"#{easing}"];',hash);
                    break
            }
            if(type == "color"){
                from = "rgb("+from.join(",")+")"
            }
            reverseProps[name] = [from , easing];
        }
        if(transfromChanged){
            ret += 'adapter.transform.set(node,t2d,isEnd,per);'
        }
        if (config.chain || config.reverse) {
            fxs.vein.push({
                startTime: 0,
                isEnd: false,
                config: reverseConfig,
                props: reverseProps
            });
        }
        //生成渲染函数
        return new Function("node,isEnd,per",ret);
    }

    dom.easing =  {
        linear:  function(pos) {
            return pos;
        },
        swing: function(pos) {
            return (-Math.cos(pos*Math.PI)/2) + 0.5;
        }
    }

    var cacheColor = {
        "black":[0,0,0],
        "silver":[192,192,192],
        "gray":[128,128,128],
        "white":[255,255,255],
        "maroon":[128,0,0],
        "red":[255,0,0],
        "purple":[128,0,128],
        "fuchsia":[255,0,255],
        "green":[0,128,0],
        "lime":[0,255,0],
        "olive":[128,128,0],
        "yellow":[255,255,0],
        "navy":[0,0,128],
        "blue":[0,0,255],
        "teal":[0,128,128],
        "aqua":[0,255,255]
    };
    var casual,casualDoc;
    function callCasual(parent,callback){
        if ( !casual ) {
            casual = DOC.createElement( "iframe" );
            casual.frameBorder = casual.width = casual.height = 0;
        }
        parent.appendChild(casual);
        if ( !casualDoc || !casual.createElement ) {
            casualDoc = ( casual.contentWindow || casual.contentDocument ).document;
            casualDoc.write( ( DOC.compatMode === "CSS1Compat" ? "<!doctype html>" : "" ) + "<html><body>" );
            casualDoc.close();
        }
        callback(casualDoc);
        parent.removeChild(casual);
    }
    function parseColor(color) {
        var value;
        callCasual(dom.HTML,function(doc){
            var range = doc.body.createTextRange();
            doc.body.style.color = color;
            value = range.queryCommandValue("ForeColor");
        });
        return [value & 0xff, (value & 0xff00) >> 8,  (value & 0xff0000) >> 16];
    }
    function color2array(val) {//将字符串变成数组
        var color = val.toLowerCase(),ret = [];
        if (cacheColor[color]) {
            return cacheColor[color];
        }
        if (color.indexOf("rgb") == 0) {
            var match = color.match(/(\d+%?)/g),
            factor = match[0].indexOf("%") !== -1 ? 2.55 : 1
            return (cacheColor[color] = [ parseInt(match[0]) * factor , parseInt(match[1]) * factor, parseInt(match[2]) * factor ]);
        } else if (color.charAt(0) == '#') {
            if (color.length == 4)
                color = color.replace(/([^#])/g, '$1$1');
            color.replace(/\w{2}/g,function(a){
                ret.push( parseInt(a, 16))
            });
            return (cacheColor[color] = ret);
        }
        if(cacheColor.VBArray){
            return (cacheColor[color] = parseColor(color));
        }
        return cacheColor.white;
    }

    var cacheDisplay = dom.oneObject("a,abbr,b,span,strong,em,font,i,img,kbd","inline");
    var blocks = dom.oneObject("div,h1,h2,h3,h4,h5,h6,section,p","block");
    dom.mix(cacheDisplay ,blocks);
    function parseDisplay( nodeName ) {
        if ( !cacheDisplay[ nodeName ] ) {
            var body = DOC.body, elem = DOC.createElement(nodeName);
            body.appendChild(elem)
            var display = dom.css(elem, "display" );
            body.removeChild(elem);
            // 先尝试连结到当前DOM树去取，但如果此元素的默认样式被污染了，就使用iframe去取
            if ( display === "none" || display === "" ) {
                callCasual(body,function(doc){
                    elem = doc.createElement( nodeName );
                    doc.body.appendChild( elem );
                    display = dom.css( elem, "display" );
                });
            }
            cacheDisplay[ nodeName ] = display;
        }
        return cacheDisplay[ nodeName ];
    }
    //show 开始时计算其width1 height1 保存原来的width height display改为inline-block或block overflow处理 赋值（width1，height1）
    //hide 保存原来的width height 赋值为(0,0) overflow处理 结束时display改为none;
    //toggle 开始时判定其是否隐藏，使用再决定使用何种策略
    dom.mix(dom, {
        _isHide : function(node) {
            var width = node.offsetWidth,
            height = node.offsetHeight;
            return (width === 0 && height === 0) ||  dom.css( node, "display" ) === "none" ;
        },
        show:function(nodes,props){//放大
            nodes = nodes.nodeType == 1 && [nodes] || nodes
            for ( var i = 0, node;node = nodes[i++];) {
                if(node.nodeType == 1 && dom._isHide(node)){
                    var old =  dom._data(node, "olddisplay"),
                    _default = parseDisplay(node.nodeName),
                    display = node.style.display = (old || _default);
                    dom._data(node, "olddisplay", display);
                    node.style.visibility = "visible";
                    if(props && ("width" in props || "height" in props)){//如果是缩放操作
                        //修正内联元素的display为inline-block，以让其可以进行width/height的动画渐变
                        if ( display === "inline" && dom.css( node, "float" ) === "none" ) {
                            if ( !dom.support.inlineBlockNeedsLayout ) {//w3c
                                node.style.display = "inline-block";
                            } else {//IE
                                if ( _default === "inline" ) {
                                    node.style.display = "inline-block";
                                }else {
                                    node.style.display = "inline";
                                    node.style.zoom = 1;
                                }
                            }
                        }
                    }
                }
            }
            return nodes;
        },
        hide:function(nodes,props, fx){//缩小
            nodes = nodes.nodeType == 1 && [nodes] || nodes
            var config = fx && fx.config;
            for ( var i = 0, node;node = nodes[i++];) {
                if(node.nodeType == 1 && !dom._isHide(node)){
                    var display = dom.css( node, "display" );
                    if ( display !== "none" && !dom._data( node, "olddisplay" ) ) {
                        dom._data( node, "olddisplay", display );
                    }
                    if(config){
                        if("width" in props || "height" in props){//如果是缩放操作
                            //确保内容不会溢出,记录原来的overflow属性，因为IE在改变overflowX与overflowY时，overflow不会发生改变
                            config.overflow = [ node.style.overflow, node.style.overflowX, node.style.overflowY ];
                            node.style.overflow = "hidden";
                        }
                        var after = config.after = (config.after || []);
                        after.unshift(function(node,props,config){
                            node.style.display = "none";
                            node.style.visibility = "hidden";
                            if ( config.overflow != null && !dom.support.shrinkWrapBlocks ) {
                                [ "", "X", "Y" ].forEach(function (postfix,index) {
                                    node.style[ "overflow" + postfix ] = config.overflow[index]
                                });
                            }
                        });
                    }else{
                        node.style.display = "none";
                    }
                }
            }
            return nodes
        }
    });
    //如果clearQueue为true，是否清空列队
    //如果jumpToEnd为true，是否跳到此动画最后一帧
    dom.fn.stop =function(clearQueue,jumpToEnd){
        clearQueue = clearQueue ? "1" : ""
        jumpToEnd =  jumpToEnd ? "1" : "0"
        var stopCode = parseInt(clearQueue+jumpToEnd,2);//返回0 1 2 3
        return this.each(function(node){
            var fxs = dom._data( node,"fx");
            if(fxs && fxs.run){
                fxs.stopCode = stopCode;
            }
        });
    }
        
    // 0 1 
    dom.fn.delay = function(ms){
        return this.each(function(node){
            var fxs = dom._data(node,"fx") || dom._data( node,"fx",{
                artery:[], //正向列队
                vein:  [], //负向列队
                run: false //
            });
            fxs.artery.push(ms);
        });
    }

    var fxAttrs = [
    [ "height", "marginTop", "marginBottom", "paddingTop", "paddingBottom" ],
    [ "width", "marginLeft", "marginRight", "paddingLeft", "paddingRight" ],
    ["opacity"]
    ]
    function genFx( type, num ) {//生成属性包
        var obj = {};
        fxAttrs.concat.apply([], fxAttrs.slice(0,num)).forEach(function(name) {
            obj[ name ] = type;
        });
        return obj;
    }
        
    var effects = {
        slideDown: genFx("show", 1),
        slideUp: genFx("hide", 1),
        slideToggle: genFx("toggle", 1),
        fadeIn: {
            opacity: "show"
        },
        fadeOut: {
            opacity: "hide"
        },
        fadeToggle: {
            opacity: "toggle"
        }
    }
    Object.keys(effects).forEach(function(key){
        dom.fn[key] = function(duration,hash){
               
            return normalizer(this, duration, hash, effects[key]);
        }
    });
    function normalizer(Instance, duration, hash, effects, before){
        if(typeof duration === "function"){
            hash = duration;
            duration = 500;
        }
        if(typeof hash === "function"){
            var after = hash;
            hash = {};
            hash.after = after;
        }
        if(before){
            var arr = hash.before =  hash.before || [];
            arr.unshift(before)
        }
        return Instance.fx(duration, dom.mix(hash,effects));
    }

    "show,hide".replace(dom.rword,function(name){
        dom.fn[name] = function(duration,hash){
            if(!arguments.length){
                return dom[name](this);
            }else{
                return normalizer(this, duration, hash, genFx(name, 3));
            }
        }
    })
    var _toggle = dom.fn.toggle;
    dom.fn.toggle = function(duration,hash){
        if(!arguments.length){
            return this.each(function(node) {
                if(node.nodeType == 1){
                    dom[ dom._isHide(node) ? "show" : "hide" ](node);
                }
            });
        }else if(typeof duration === "function" && typeof duration === "function" ){
            _toggle.apply(this,arguments)
        }else{
            return normalizer(this, duration, hash, genFx("toggle", 3));
        }
    }
    function beforePuff(node, props, fx) {
        var position = dom.css(node,"position"),
        width = dom.css(node,"width"),
        height = dom.css(node,"height"),
        left = dom.css(node,"left"),
        top = dom.css(node,"top");
        node.style.position = "relative";
        dom.mix(props, {
            width: "*=1.5",
            height: "*=1.5",
            opacity: "hide",
            left: "-=" + parseInt(width)  * 0.25,
            top: "-=" + parseInt(height) * 0.25
        });
        var arr = fx.config.after =  fx.config.after || [];
        arr.unshift(function(node){
            node.style.position = position;
            node.style.width = width;
            node.style.height = height;
            node.style.left = left;
            node.style.top = top;
        });
    }
    //扩大1.5倍并淡去
    dom.fn.puff = function(duration, hash) {
        return normalizer(this, duration, hash, {}, beforePuff);
    }
});


//2011.10.10 改进dom.fn.stop
//2011.10.20 改进所有特效函数，让传参更加灵活
//2011.10.21 改进内部的normalizer函数
