package com;

import java.io.IOException;

public class EvilClass implements AutoCloseable {
    private String cmd;

    public EvilClass(String cmd) {
        this.cmd = cmd;
    }

    public void setCmd(String cmd) {
        this.cmd = cmd;
    }

    @Override
    public void close() throws Exception {
        
    }


    public String getCmd() throws IOException {
        Runtime.getRuntime().exec(this.cmd);
        return this.cmd;
    }
}