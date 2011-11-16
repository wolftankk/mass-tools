SRC_DIR = src/mass
BUILD_DIR = build

PREFIX = .
DIST_DIR = ${PREFIX}/dist
JAVA_ENGINE ?= `which java`
COMPILER = ${JAVA_ENGINE} -jar ${BUILD_DIR}/compiler.jar

#这里按照依照关系排列
BASE_FILES = ${SRC_DIR}/dom.js\
			 ${SRC_DIR}/ecma.js\
			 ${SRC_DIR}/ajax.js\
			 ${SRC_DIR}/attr.js\
			 ${SRC_DIR}/class.js\
			 ${SRC_DIR}/css.js\
			 ${SRC_DIR}/css_ie.js\
			 ${SRC_DIR}/data.js\
			 ${SRC_DIR}/dispatcher.js\
			 ${SRC_DIR}/event.js\
			 ${SRC_DIR}/fx.js\
			 ${SRC_DIR}/lang.js\
			 ${SRC_DIR}/node.js\
			 ${SRC_DIR}/query.js\
			 ${SRC_DIR}/support.js

MODULES = ${BASE_FILES}

MASS = ${DIST_DIR}/mass.js
MASS_MIN = ${DIST_DIR}/mass.min.js

#get version
MASS_VER = $(shell cat version.txt)
VERSION = sed "s/@VERSION/${MASS_VER}/"

DATE = $(shell git log -l --pretty=format:%ad)

${DIST_DIR}:
	@@mkdir -p ${DIST_DIR}

all: update_submodules

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
