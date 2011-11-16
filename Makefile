SRC_DIR = src/mass
BUILD_DIR = build

PREFIX = .
DIST_DIR = ${PREFIX}/dist
JAVA_ENGINE ?= `which java`
PYTHON_ENGINE ?= `which python`
COMPILER = ${JAVA_ENGINE} -jar ${BUILD_DIR}/compiler.jar
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
	@@if test ! -z ${PYTHON_ENGINE}; then \
		${PYTHON_ENGINE} packager.py; \
	fi

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
