SRC_DIR = src/mass
BUILD_DIR = build

PREFIX = .
DIST_DIR = ${PREFIX}/dist
JAVA_ENGINE ?= `which java`
COMPILER = ${JAVA_ENGINE} -jar ${BUILD_DIR}/compiler.jar

#这里按照依照关系排列
BASE_FILES = dom.js \
			 ecma.js\
			 ajax.js\
			 attr.js\
			 class.js\
			 css.js\
			 css_ie.js\
			 data.js\
			 dispatcher.js\
			 event.js\
			 fx.js\
			 lang.js\
			 node.js\
			 query.js\
			 support.js

MODULES = ${BASE_FILES}

MASS = ${DIST_DIR}/mass.js
MASS_MIN = ${DIST_DIR}/mass.min.js

#get version
MASS_VER = $(shell cat version.txt)
VERSION = sed "s/@VERSION/${MASS_VER}/"

DATE = $(shell git log -l --pretty=format:%ad)

${DIST_DIR}:
	@@mkdir -p ${DIST_DIR}

mass: $(MASS)

all: update_submodules minfiles

build: ${MASS}

${MASS}: clean ${DIST_DIR}
	@@echo "Building " ${MASS}
	
	@for file in ${BASE_FILES}; do \
		cat $(addprefix ${SRC_DIR}/, ${BASE_FILES}) | \
	   		sed 's/})(this,this.document);//' \
			> ${MASS}; \
	done
	@echo 'var module_value = { \
        state:2 \
    }; \
    var list = "ecma,lang,spec,support,class,data,query,node,css_ie,css,dispatcher,event,attr,fx,ajax".match(dom.rword); \
    for(var i=0, module;module = list[i++];){ \
        map["@"+module] = module_value; \
    }' >> ${MASS};
	@echo '})(this,this.document);' >> ${MASS};

${MASS_MIN}: ${MASS} 
	@@if test ! -z ${JAVA_ENGINE}; then \
		echo "Minifying " ${MASS_MIN}; \
		${COMPILER} --jscomp_off=internetExplorerChecks --js ${MASS} --js_output_file ${MASS_MIN}; \
	fi

min: ${MASS_MIN} 

update_submodules:
	@if [ -d .git ]; then\
		if git submodule status | grep -q -E -i '^-'; then \
			git submodule update --init --recursive; \
		else \
			git submodule update --init --recursive --merge; \
		fi; \
	fi

clean:
	@@echo "Removing Dist dir:" ${DIST_DIR}
	@@rm -rf ${DIST_DIR}
