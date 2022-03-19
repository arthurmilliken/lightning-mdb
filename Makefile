CC = gcc
AR = ar
W = -W -Wall -Wno-unused-parameter -Wbad-function-cast -Wuninitialized
THREADS = -pthread
OPT = -O2 -g
CFLAGS = $(THREADS) $(OPT) $(W)
SOEXT = .so
prefix = build
srcdir = deps/liblmdb
bindir = $(prefix)/bin
libdir = $(prefix)/lib
objdir = $(prefix)/obj
incdir = $(prefix)/include

########################################################################

INC_DIRS = -I./ $(addprefix -I, $(incdir))/

all: $(libdir)/liblmdb.so $(libdir)/liblmdb.a awm lmdb-ffi

clean:
	rm -rf $(bindir)/* $(objdir)/* $(libdir)/* $(incdir)/*

$(libdir)/liblmdb.a: $(objdir)/mdb.o $(objdir)/midl.o
	mkdir -p $(libdir)
	$(AR) rs $@ $(objdir)/mdb.o $(objdir)/midl.o

$(libdir)/liblmdb.so: $(objdir)/mdb.lo $(objdir)/midl.lo
	$(CC) -pthread -shared -o $@ $(objdir)/mdb.lo $(objdir)/midl.lo

$(incdir)/lmdb.h:
	mkdir -p $(@D)
	cp $(srcdir)/lmdb.h $@

$(incdir)/midl.h:
	mkdir -p $(@D)
	cp $(srcdir)/midl.h $@

$(objdir)/mdb.o: $(srcdir)/mdb.c $(incdir)/lmdb.h $(incdir)/midl.h
	mkdir -p $(@D)
	$(CC) $(CFLAGS) -c $< -o $@ $(INC_DIRS)

$(objdir)/midl.o: $(srcdir)/midl.c $(incdir)/midl.h
	mkdir -p $(@D)
	$(CC) $(CFLAGS) -c $< -o $@ $(INC_DIRS)

$(objdir)/mdb.lo: $(srcdir)/mdb.c $(incdir)/lmdb.h $(incdir)/midl.h
	mkdir -p $(@D)
	$(CC) $(CFLAGS) -fPIC -c $< -o $@ $(INC_DIRS)

$(objdir)/midl.lo: $(srcdir)/midl.c $(incdir)/midl.h
	mkdir -p $(@D)
	$(CC) $(CFLAGS) -fPIC -c $< -o $@ $(INC_DIRS)


# ------- AWM ------
.PHONY += awm
awm: $(bindir)/awm

$(bindir)/awm: $(objdir)/awm.o $(libdir)/liblmdb.so
	mkdir -p .testdb
	mkdir -p $(@D)
	$(CC) $(CFLAGS) $^ -o $@

$(objdir)/awm.o: src/awm.c $(incdir)/lmdb.h
	mkdir -p $(@D)
	$(CC) $(CFLAGS) -c $< -o $@

# ------ LMDB-FFI ------
.PHONY += lmdb-ffi

lmdb-ffi: $(bindir)/lmdb-ffi $(libdir)/liblmdb-ffi.so

$(bindir)/lmdb-ffi: $(objdir)/lmdb-ffi.o $(libdir)/liblmdb.so
	mkdir -p .testdb
	mkdir -p $(@D)
	$(CC) $(CFLAGS) $^ -o $@

$(libdir)/liblmdb-ffi.so: $(objdir)/lmdb-ffi.o $(libdir)/liblmdb.so
	$(CC) $(CFLAGS) -pthread -shared -o $@ $< $(objdir)/mdb.lo $(objdir)/midl.lo

$(objdir)/lmdb-ffi.o: src/lmdb-ffi.c $(incdir)/lmdb.h
	mkdir -p $(@D)
	$(CC) $(CFLAGS) -fPIC -c $< -o $@