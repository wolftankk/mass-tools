//数据请求模块

dom.define("ajax","node,emitter", function(){
    //dom.log("已加载ajax模块");
    var global = this, DOC = global.document, r20 = /%20/g,
    rCRLF = /\r?\n/g,
    encode = global.encodeURIComponent,
    rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg, // IE leaves an \r character at EOL
    rlocalProtocol = /^(?:about|app|app\-storage|.+\-extension|file|res|widget):$/,
    rnoContent = /^(?:GET|HEAD)$/,
    rquery = /\?/,
    rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/,
    // Document location
    ajaxLocation
    // #8138, IE may throw an exception when accessing
    // a field from window.location if document.domain has been set
    try {
        ajaxLocation = global.location.href;
    } catch( e ) {
        // Use the href attribute of an A element
        // since IE will modify it given document.location
        ajaxLocation = DOC.createElement( "a" );
        ajaxLocation.href = "";
        ajaxLocation = ajaxLocation.href;
    }
 
    // Segment location into parts
    var ajaxLocParts = rurl.exec( ajaxLocation.toLowerCase() ) || [],
    transports = { },//传送器
    converters ={//转换器
        text: function(dummyXHR,text,xml){
            return text != undefined ? text : ("xml" in xml ?  xml.xml: new XMLSerializer().serializeToString(xml));
        },
        xml : function(dummyXHR,text,xml){
            return xml != undefined ? xml : dom.parseXML(text);
        },
        html : function(dummyXHR,text,xml){
            return  dom.parseHTML(text);
        },
        json : function(dummyXHR,text,xml){
            return  dom.parseJSON(text);
        },
        script: function(dummyXHR,text,xml){
            dom.globalEval(text);
        }
    },
    accepts  = {
        xml: "application/xml, text/xml",
        html: "text/html",
        text: "text/plain",
        json: "application/json, text/javascript",
        script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript",
        "*": "*/*"
    },
    defaultOptions = {
        type:"GET",
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        async:true,
        dataType:"text",
        jsonp: "callback"
    };
 
    function normalizeOptions(o) {
        // deep mix
        o = dom.Object.merge.call( {},defaultOptions, o);
        //判定是否跨域
        if (o.crossDomain == null) {
            var parts = rurl.exec(o.url.toLowerCase());
            o.crossDomain = !!( parts &&
                ( parts[ 1 ] != ajaxLocParts[ 1 ] || parts[ 2 ] != ajaxLocParts[ 2 ] ||
                    ( parts[ 3 ] || ( parts[ 1 ] === "http:" ?  80 : 443 ) )
                    !=
                    ( ajaxLocParts[ 3 ] || ( ajaxLocParts[ 1 ] === "http:" ?  80 : 443 ) ) )
                );
        }
        //转换data为一个字符串
        if ( o.data && o.data !== "string") {
            o.data = dom.param( o.data );
        }
        //type必须为大写
        o.type = o.type.toUpperCase();
        o.hasContent = !rnoContent.test(o.type);
 
        if (!o.hasContent) {//如果为GET请求,则参数依附于url上
            if (o.data) {
                o.url += (rquery.test(o.url) ? "&" : "?" ) + o.data;
            }
            if (o.cache === false) {
                o.url += (rquery.test(o.url) ? "&" : "?" ) + "_time=" + Date.now();
            }
        }
        return o;
    }
 
    "get post".replace(dom.rword,function(method){
        dom[ method ] = function( url, data, callback, type ) {
            // shift arguments if data argument was omitted
            if ( dom.isFunction( data ) ) {
                type = type || callback;
                callback = data;
                data = undefined;
            }
            return dom.ajax({
                type: method,
                url: url,
                data: data,
                success: callback,
                dataType: type
            });
        };
 
    });
 
    dom.mix(dom,{
        getScript: function( url, callback ) {
            return dom.get( url, null, callback, "script" );
        },
 
        getJSON: function( url, data, callback ) {
            return dom.get( url, data, callback, "json" );
        },
        upload: function(url, form, data, callback, dataType) {
            if (dom.isFunction(data)) {
                dataType = callback;
                callback = data;
                data = undefined;
            }
            return dom.ajax({
                url:url,
                type:'post',
                dataType:dataType,
                form:form,
                data:data,
                success:callback
            });
        },
        serialize : function(form) {
            return dom.param(dom.serializeArray(form));
        },
        serializeArray : function(form){
            // 不直接转换form.elements，防止以下情况：   <form > <input name="elements"/><input name="test"/></form>
            var elements = dom.slice(form||[]), ret = []
            elements.forEach(function(elem){
                if( elem.name && !elem.disabled && ( "checked" in elem ? elem.checked : 1 )){
                    var val = dom( elem ).val();
                    if(Array.isArray(val)){
                        val.forEach(function(value){
                            ret.push({
                                name: elem.name,
                                value: value.replace( rCRLF, "\r\n" )
                            });
                        });
                    }else if(typeof val == "string"){
                        ret.push({
                            name: elem.name,
                            value: val.replace( rCRLF, "\r\n" )
                        });
                    }
                }
            });
            return ret;
        },
        param : function( object ) {//objectToQuery
            var ret = [];
            function add( key, value ){
                ret[ ret.length ] = encode(key) + '=' + encode(value);
            }
            if ( Array.isArray(object) ) {
                for ( var i = 0, length = object.length; i < length; i++ ) {
                    add( object[i].name, object[i].value );
                }
            } else {
                function buildParams(obj, prefix) {
                    if ( Array.isArray(obj) ) {
                        for ( var i = 0, length = obj.length; i < length; i++ ) {
                            buildParams( obj[i], prefix );
                        }
                    } else if( dom.isPlainObject(obj) ) {
                        for ( var j in obj ) {
                            var postfix = ((j.indexOf("[]") > 0) ? "[]" : ""); // move the brackets to the end (if applicable)
                            buildParams(obj[j], (prefix ? (prefix+"["+j.replace("[]", "")+"]"+postfix) : j) );
                        }
                    } else {
                        add( prefix, dom.isFunction(obj) ? obj() : obj );
                    }
                }
                buildParams(obj);
            }
            return ret.join("&").replace(r20, "+");
        }
    });
 
    var ajax = dom.ajax = function(object) {
        if (!object.url) {
            return undefined;
        }
        var options = normalizeOptions(object),//规整化参数对象
        //创建一个伪XMLHttpRequest,能处理complete,success,error等多投事件
        dummyXHR = new dom.jXHR(options),
        dataType = options.dataType;
 
        if(options.form && options.form.nodeType ==1){
            dataType = "iframe";
        }else if(dataType == "jsonp"){
            if(options.crossDomain){
                ajax.fire("start", dummyXHR, options.url,options.jsonp);//用于jsonp请求
                dataType = "script"
            }else{
                dataType = dummyXHR.options.dataType = "json";
            }
        }
        var transportContructor = transports[dataType] || transports._default,
        transport = new transportContructor();
        transport.dummyXHR = dummyXHR;
        dummyXHR.transport = transport;
        if (options.contentType) {
            dummyXHR.setRequestHeader("Content-Type", options.contentType);
        }
 
        //添加dataType所需要的Accept首部
        dummyXHR.setRequestHeader( "Accept", accepts[dataType] ? accepts[ dataType ] +  ", */*; q=0.01"  : accepts[ "*" ] );
        for (var i in options.headers) {
            dummyXHR.setRequestHeader(i, options.headers[ i ]);
        }
 
        "Complete Success Error".replace(dom.rword, function(name){
            var method = name.toLowerCase();
            dummyXHR[method] = dummyXHR["on"+name];
            if(typeof options[method] === "function"){
                dummyXHR[method](options[method]);
                delete dummyXHR.options[method];
                delete options[method];
            }
        });
        dummyXHR.readyState = 1;
        // Timeout
        if (options.async && options.timeout > 0) {
            dummyXHR.timeoutID = setTimeout(function() {
                dummyXHR.abort("timeout");
            }, options.timeout);
        }
 
        try {
            dummyXHR.state = 1;//已发送
            transport.send();
        } catch (e) {
            if (dummyXHR.status < 2) {
                dummyXHR.callback(-1, e);
            } else {
                dom.log(e);
            }
        }
 
        return dummyXHR;
    }
 
    dom.mix(ajax, dom.dispatcher);
    ajax.isLocal = rlocalProtocol.test(ajaxLocParts[1]);
    /**
         * jXHR类,用于模拟原生XMLHttpRequest的所有行为
         */
    dom.jXHR = dom.factory({
        implement:dom.dispatcher,
        init:function(option){
            dom.mix(this, {
                responseData:null,
                timeoutID:null,
                responseText:null,
                responseXML:null,
                responseHeadersString:"",
                responseHeaders:null,
                requestHeaders:{},
                readyState:0,
                //internal state
                state:0,
                statusText:null,
                status:0,
                transport:null
            });
 
            this.defineEvents("complete success error");
            this.setOptions(option);
        },
 
        fire: function(type){
            var target = this, table = dom._data( target,"events") ,args = dom.slice(arguments,1);
            if(!table) return;
            var queue = table[type];
            if (  queue ) {
                for ( var i = 0, bag; bag = queue[i++]; ) {
                    bag.callback.apply( target, args );
                }
            }
        },
 
        setRequestHeader: function(name, value) {
            this.requestHeaders[ name ] = value;
            return this;
        },
 
        getAllResponseHeaders: function() {
            return this.state === 2 ? this.responseHeadersString : null;
        },
        getResponseHeader: function(key,/*internal*/ match) {
            if (this.state === 2) {
                if (!this.responseHeaders) {
                    this.responseHeaders = {};
                    while (( match = rheaders.exec(this.responseHeadersString) )) {
                        this.responseHeaders[ match[1] ] = match[ 2 ];
                    }
                }
                match = this.responseHeaders[ key];
            }
            return match === undefined ? null : match;
        },
        // 重写 content-type 首部
        overrideMimeType: function(type) {
            if (!this.state) {
                this.mimeType = type;
            }
            return this;
        },
 
        // 中止请求
        abort: function(statusText) {
            statusText = statusText || "abort";
            if (this.transport) {
                this.transport._callback(0, 1);
            }
            this.callback(0, statusText);
            return this;
        },
        /**
             * 用于触发success,error,complete等回调
             * http://www.cnblogs.com/rubylouvre/archive/2011/05/18/2049989.html
             * @param {Number} status 状态码
             * @param {String} statusText 对应的扼要描述
             */
        callback:function(status, statusText) {
            // 只能执行一次，防止重复执行
            // 例如完成后，调用 abort
            // 到这要么成功，调用success, 要么失败，调用 error, 最终都会调用 complete
            if (this.state == 2) {//2:已执行回调
                return;
            }
            this.state = 2;
            this.readyState = 4;
            var isSuccess;
            if (status >= 200 && status < 300 || status == 304) {
                if (status == 304) {
                    statusText = "notmodified";
                    isSuccess = true;
                } else {
                    var text = this.responseText, xml = this.responseXML,dataType = this.options.dataType;
                    try{
                        dom.log(text)
                        this.responseData = converters[dataType](this, text, xml);
                        statusText = "success";
                        isSuccess = true;
                        dom.log("dummyXHR.callback success");
                    } catch(e) {
                        dom.log("dummyXHR.callback parsererror")
                        statusText = "parsererror : " + e;
                    }
                }
 
            }
            else {
                if (status < 0) {
                    status = 0;
                }
            }
 
            this.status = status;
            this.statusText = statusText;
            if (this.timeoutID) {
                clearTimeout(this.timeoutID);
            }
            if (isSuccess) {
                this.fire("success",this.responseData,statusText);
            } else {
                this.fire("error",this.responseData,statusText);
            }
            this.fire("complete",this.responseData,statusText);
            this.transport = undefined;
        }
    });
 
    //http://www.cnblogs.com/rubylouvre/archive/2010/04/20/1716486.html
    //【XMLHttpRequest】传送器，专门用于上传
    var s = ["XMLHttpRequest",
    "ActiveXObject('Msxml2.XMLHTTP.6.0')",
    "ActiveXObject('Msxml2.XMLHTTP.3.0')",
    "ActiveXObject('Msxml2.XMLHTTP')",
    "ActiveXObject('Microsoft.XMLHTTP')"];
    if( !-[1,] && global.ScriptEngineMinorVersion() === 7 && location.protocol === "file:"){
        s.shift();
    }
    for(var i = 0 ,axo;axo = s[i++];){
        try{
            if(eval("new "+ axo)){
                dom.xhr = new Function( "return new "+axo);
                break;
            }
        }catch(e){}
    }
    if (dom.xhr) {
        var nativeXHR = new dom.xhr(), allowCrossDomain = false;
        if ("withCredentials" in nativeXHR) {
            allowCrossDomain = true;
        }
        //添加通用XMLHttpRequest传送器
        transports._default =  dom.factory({
            //发送请求
            send:function() {
                var self = this,
                dummyXHR = self.dummyXHR,
                options = dummyXHR.options;
                dom.log("XhrTransport.sending.....");
                if (options.crossDomain && !allowCrossDomain) {
                    dom.error("do not allow crossdomain xhr !");
                    return;
                }
 
                var nativeXHR = new dom.xhr(), i;
                self.xhr = nativeXHR;
                if (options.username) {
                    nativeXHR.open(options.type, options.url, options.async, options.username, options.password)
                } else {
                    nativeXHR.open(options.type, options.url, options.async);
                }
                // Override mime type if supported
                if (dummyXHR.mimeType && nativeXHR.overrideMimeType) {
                    nativeXHR.overrideMimeType(dummyXHR.mimeType);
                }
                // 用于进入request.xhr?分支
                if (!options.crossDomain && !dummyXHR.requestHeaders["X-Requested-With"]) {
                    dummyXHR.requestHeaders[ "X-Requested-With" ] = "XMLHttpRequest";
                }
                try {
                    for (i in dummyXHR.requestHeaders) {
                        nativeXHR.setRequestHeader(i, dummyXHR.requestHeaders[ i ]);
                    }
                } catch(e) {
                    dom.log(" nativeXHR setRequestHeader occur error ");
                }
 
                nativeXHR.send(options.hasContent && options.data || null);
                //在同步模式中,IE6,7可能会直接从缓存中读取数据而不会发出请求,因此我们需要手动发出请求
                if (!options.async || nativeXHR.readyState == 4) {
                    self._callback();
                } else {
                    nativeXHR.onreadystatechange = function() {
                        self._callback();
                    }
                }
            },
 
            //用于获取原始的responseXMLresponseText 修正status statusText
            //第二个参数为1时中止清求
            _callback:function(event, isAbort) {
                // Firefox throws exceptions when accessing properties
                // of an xhr when a network error occured
                // http://helpful.knobs-dials.com/index.php/Component_returned_failure_code:_0x80040111_(NS_ERROR_NOT_AVAILABLE)
                try {
                    var self = this,nativeXHR = self.xhr, dummyXHR = self.dummyXHR;
                    if (isAbort || nativeXHR.readyState == 4) {
                        nativeXHR.onreadystatechange = dom.noop;
                        if (isAbort) {
                            // 完成以后 abort 不要调用
                            if (nativeXHR.readyState !== 4) {
                                //IE的XMLHttpRequest.abort实现于 MSXML 3.0+
                                //http://blogs.msdn.com/b/xmlteam/archive/2006/10/23/using-the-right-version-of-msxml-in-internet-explorer.aspx
                                try{
                                    nativeXHR.abort &&  nativeXHR.abort();
                                }catch(e){};
                            }
                        } else {
                            var status = nativeXHR.status;
                            dummyXHR.responseHeadersString = nativeXHR.getAllResponseHeaders();
                            var xml = nativeXHR.responseXML;
                            // Construct response list
                            if (xml && xml.documentElement /* #4958 */) {
                                dummyXHR.responseXML = xml;
                            }
                            dummyXHR.responseText = nativeXHR.responseText;
                            //火狐在跨城请求时访问statusText值会抛出异常
                            try {
                                var statusText = nativeXHR.statusText;
                            } catch(e) {
                                statusText = "";
                            }
                            //用于处理特殊情况,如果是一个本地请求,只要我们能获取数据就假当它是成功的
                            if (!status && ajax.isLocal && !dummyXHR.options.crossDomain) {
                                status = dummyXHR.responseText ? 200 : 404;
                            //IE有时会把204当作为1223
                            //returning a 204 from a PUT request - IE seems to be handling the 204 from a DELETE request okay.
                            } else if (status === 1223) {
                                status = 204;
                            }
                            dummyXHR.callback(status, statusText);
                        }
                    }
                } catch (firefoxAccessException) {
                    dom.log(firefoxAccessException)
                    nativeXHR.onreadystatechange = dom.noop;
                    if (!isAbort) {
                        dummyXHR.callback(-1, firefoxAccessException);
                    }
                }
            }
        });
 
    }
    //【script节点】传送器，只用于跨域的情况
    transports.script = dom.factory({
        send:function() {
            var self = this,
            dummyXHR = self.dummyXHR,
            options = dummyXHR.options,
            head = dom.head,
            script = self.script = DOC.createElement("script");
            script.async = "async";
            dom.log("ScriptTransport.sending.....");
            if (options.charset) {
                script.charset = options.charset
            }
            //当script的资源非JS文件时,发生的错误不可捕获
            script.onerror = script.onload = script.onreadystatechange = function(e) {
                e = e || global.event;
                self._callback((e.type || "error").toLowerCase());
            };
            script.src = options.url
            head.insertBefore(script, head.firstChild);
        },
 
        _callback:function(event, isAbort) {
            var node = this.script,
            dummyXHR = this.dummyXHR;
            if (isAbort || dom.rreadystate.test(node.readyState)  || event == "error"  ) {
                node.onerror = node.onload = node.onreadystatechange = null;
                var parent = node.parentNode;
                if(parent && parent.nodeType === 1){
                    parent.removeChild(node);
                    this.script = undefined;
                }
                //如果没有中止请求并没有报错
                if (!isAbort && event != "error") {
                    dummyXHR.callback(200, "success");
                }
                // 非 ie<9 可以判断出来
                else if (event == "error") {
                    dummyXHR.callback(500, "scripterror");
                }
            }
        }
    });
 
    //http://www.decimage.com/web/javascript-cross-domain-solution-with-jsonp.html
    //JSONP请求，借用【script节点】传送器
    converters["script json"] = function(dummyXHR){
        return dom["jsonp"+ dummyXHR.uniqueID ]();
    }
    ajax.bind("start", function(e, dummyXHR, url, jsonp) {
        dom.log("jsonp start...");
        var jsonpCallback = "jsonp"+dummyXHR.uniqueID;
        dummyXHR.options.url = url  + (rquery.test(url) ? "&" : "?" ) + jsonp + "=" + DOC.URL.replace(/(#.+|\W)/g,'')+"."+jsonpCallback;
        dummyXHR.options.dataType = "script json";
        //将后台返回的json保存在惰性函数中
        global.dom[jsonpCallback]= function(json) {
            global.dom[jsonpCallback] = function(){
                return json;
            };
        };
    });
 
    function createIframe(dummyXHR, transport) {
        var id = "iframe-upload-"+dummyXHR.uniqueID;
        var iframe = dom.parseHTML("<iframe " +
            " id='" + id + "'" +
            " name='" + id + "'" +
            " style='display:none'/>").firstChild;
        iframe.transport = transport;
        return   (DOC.body || DOC.documentElement).insertBefore(iframe,null);
    }
 
    function addDataToForm(data, form) {
        var input = DOC.createElement("input"), ret = [];
        input.type = 'hidden';
        dom.serializeArray(data).forEach(function(obj){
            var elem =  input.cloneNode(true);
            elem.name = obj.name;
            elem.value = obj.value;
            form.appendChild(elem);
            ret.push(elem);
        });
        return ret;
    }
    //【iframe】传送器，专门用于上传
    //http://www.profilepicture.co.uk/tutorials/ajax-file-upload-xmlhttprequest-level-2/ 上传
    transports.iframe = dom.factory({
        send:function() {
            var self = this,
            dummyXHR = self.dummyXHR,
            options = dummyXHR.options,
            form = options.form
            //form.enctype的值
            //1:application/x-www-form-urlencoded   在发送前编码所有字符（默认）
            //2:multipart/form-data 不对字符编码。在使用包含文件上传控件的表单时，必须使用该值。
            //3:text/plain  空格转换为 "+" 加号，但不对特殊字符编码。
            this.backups = {
                target:form.target || "",
                action:form.action || "",
                enctype:form.enctype,
                method:form.method
            };
 
            var iframe = createIframe(dummyXHR, this);
            //必须指定method与enctype，要不在FF报错
            //“表单包含了一个文件输入元素，但是其中缺少 method=POST 以及 enctype=multipart/form-data，所以文件将不会被发送。”
            // 设置target到隐藏iframe，避免整页刷新
            form.target =  "iframe-upload-"+dummyXHR.uniqueID;
            form.action =  options.url;
            form.method =  "POST";
            form.enctype = "multipart/form-data";
            this.fields = options.data ? addDataToForm(options.data, form) : [];
            this.form = form;//一个表单元素
            dom.log("iframe transport...");
            dom(iframe).bind("load",this._callback).bind("error",this._callback);
            form.submit();
        },
 
        _callback:function(event  ) {
            var iframe = this,
            transport =  iframe.transport;
            // 防止重复调用 , 成功后 abort
            if (!transport) {
                return;
            }
            dom.log("transports.iframe _callback")
            var form = transport.form,
            eventType = event.type,
            dummyXHR = transport.dummyXHR;
            iframe.transport = undefined;
            if (eventType == "load") {
                var doc = iframe.contentDocument ? iframe.contentDocument : window.frames[iframe.id].document;
                var iframeDoc = iframe.contentWindow.document;
                if (doc.XMLDocument) {
                    dummyXHR.responseXML = doc.XMLDocument;
                } else if (doc.body){
                    // response is html document or plain text
                    dummyXHR.responseText = doc.body.innerHTML;
                    dummyXHR.responseXML = iframeDoc;
                    //当，MIME为"text/plain",浏览器会把文本放到一个PRE标签中
                    if (doc.body.firstChild && doc.body.firstChild.nodeName.toUpperCase() == 'PRE') {
                        dummyXHR.responseText  = doc.body.firstChild.firstChild.nodeValue;
                    }
                }else {
                    // response is a xml document
                    dummyXHR.responseXML = doc;
                }
                dummyXHR.callback(200, "success");
            } else if (eventType == 'error') {
                dummyXHR.callback(500, "error");
            }
            for(var i in transport.backups){
                form[i] = transport.backups[i];
            }
            //还原form的属性
            transport.fields.forEach(function(elem){
                elem.parentNode.removeChild(elem);
            });
            dom(iframe).unbind("load",transport._callback).unbind("error",transport._callback);
            iframe.clearAttributes &&  iframe.clearAttributes();
            setTimeout(function() {
                // Fix busy state in FF3
                iframe.parentNode.removeChild(iframe);
                dom.log("iframe.parentNode.removeChild(iframe)")
            }, 0);
 
        }
    });
 
});

//2011.8.31
//将会传送器的abort方法上传到dom.jXHR.abort去处理
//修复serializeArray的bug
//对XMLHttpRequest.abort进行try...catch

