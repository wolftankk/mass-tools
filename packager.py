#coding: utf-8

import os, io, re;
from cStringIO import StringIO


#mass-Framework root dir
ROOT_DIR = "massframework"
#mass-Framework main dir
SRC_DIR = os.path.join(os.path.abspath(ROOT_DIR), "mass")
CORE_FILE = os.path.join(SRC_DIR, "dom.js")
#mass-Framework plugins dir
PLUGINS_DIR = os.path.join(SRC_DIR, "more")

DIST_DIR = os.path.abspath("dist")
MASS = os.path.join(DIST_DIR, "mass.js");
MASS_MIN = os.path.join(DIST_DIR, "mass.min.js");

#google compiler tools
BUILD_DIR = os.path.abspath("build")

list = [];

moduleStream = StringIO()
coreStram = StringIO();
for js in sorted(os.listdir(SRC_DIR)):
	js_file = os.path.join(SRC_DIR, js);
	if (os.path.isdir(js_file)):
		continue
	f = open(js_file);
	if (js_file == CORE_FILE):
		coreStram.write(f.read());
	else:
		list.append(os.path.basename(js_file) [:-3])
		moduleStream.write(f.read());
	f.close();

core = coreStram.getvalue();

#replace
#print replace(core, r'}\)\(this,this\.document\);', core)

add_value = """
	var module_value = {
		state: 2
	}
	var list = \" """ + ",".join(list) + """\".match(dom.rword);
	for (var i=0, module; module = list[i++];){
		map["@"+module] = module_value;
	}
"""

new_stream = core.replace('/*combine modules*/', add_value + "\r\n" + moduleStream.getvalue());
new_file = open(MASS, "w")
new_file.write(new_stream);
new_file.close();
