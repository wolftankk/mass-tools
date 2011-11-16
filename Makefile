SRC_DIR = src/mass
BUILD_DIR = build

PREFIX = .
DIST_DIR = ${PREFIX}/dist
JAVA_ENGINE ?= `which java`
COMPILER = ${JAVA_ENGINE} -jar ${BUILD_DIR}/compiler.jar

#这里按照依照关系排列
BASE_FILES = dom.js\
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

all: update_submodules ${MASS}

#cat $$file > ${DIST_DIR};
${MASS}: ${DIST_DIR}
	@for file in $(basename ${BASE_FILES}); do \
		cat ${SRC_DIR}/$$file.js > ${DIST_DIR}/$$file.js; \
		if test ! -z ${JAVA_ENGINE}; then \
			echo "Minifying " $$file.min.js; \
			${COMPILER} --js ${SRC_DIR}/$$file.js --js_output_file ${DIST_DIR}/$$file.min.js; \
		fi \
	done

build: ${MASS}

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
