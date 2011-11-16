//==================================================
// 数据缓存模块
//==================================================
dom.define("data", "lang", function(){
   // dom.log("已加载data模块");
    var remitter = /object|function/
    dom.mix(dom,{
        memcache:{},
        // 读写数据
        data : function( target, name, data, pvt ) {
            if(target && remitter.test(typeof target)){//只处理HTML节点与普通对象
                var id = target.uniqueNumber || (target.uniqueNumber = dom.uuid++);
                if(name === "@uuid"){
                    return id;
                }
                var memcache = target.nodeType === 1 ? dom.memcache: target;
                var table = memcache[ "@data_"+id ] || (memcache[ "@data_"+id ] = {});
                if ( !pvt ) {
                    table = table.data || (table.data = {});
                }
                var getByName = typeof name === "string";
                if ( name && typeof name == "object" ) {
                    dom.mix(table, name);
                }else if(getByName && data !== void 0){
                    table[ name ] = data;
                }
                return getByName ? table[ name ] : table;
            }
        },
        _data:function(target,name,data){
            return dom.data(target, name, data, true)
        },
        //移除数据
        removeData : function(target, name, pvt){
            if(target && remitter.test(typeof target)){
                var id = target.uniqueNumber;
                if (  !id ) {
                    return;
                }
                var memcache = target.nodeType === 1  ? dom.memcache : target;
                var table = memcache["@data_"+id], clear = 1, ret = typeof name == "string" ;
                if ( table && ret ) {
                    if(!pvt){
                        table = table.data
                    }
                    if(table){
                        ret = table[ name ];
                        delete table[ name ];
                    }
                    var cache = memcache["@data_"+id];
                        loop:
                        for(var key in cache){
                            if(key == "data"){
                                for(var i in cache.data){
                                    clear = 0;
                                    break loop;
                                }
                            }else{
                                clear = 0;
                                break loop;
                            }
                        }
                }
                if(clear){
                    delete memcache["@data_"+id];
                }
                return ret;
            }
        },
        //合并数据
        mergeData:function(neo, src){
            var srcData = dom._data(src), neoData = dom._data(neo), events = srcData.events;
            if(srcData && neoData){
                dom.Object.merge.call(neoData, srcData);
                if(events){
                    delete neoData.handle;
                    neoData.events = {};
                    for ( var type in events ) {
                        for (var i = 0, obj ; obj =  events[ type ][i++]; ) {
                            dom.event.bind.call( neo, type + ( obj.namespace ? "." : "" ) + obj.namespace, obj.handler, obj.selector, obj.times );
                        }
                    }
                }
            }
        }
    });
});

//2011.9.27 uniqueID改为uniqueNumber 简化data与removeData
//2011.9.28 添加dom._data处理内部数据
//2011.10.21 强化mergeData，可以拷贝事件

