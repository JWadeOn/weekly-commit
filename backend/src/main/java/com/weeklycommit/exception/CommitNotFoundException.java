package com.weeklycommit.exception;

public class CommitNotFoundException extends RuntimeException {

    public CommitNotFoundException(String message) {
        super(message);
    }
}
