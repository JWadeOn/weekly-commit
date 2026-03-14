package com.weeklycommit.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.HashMap;
import java.util.Map;

/**
 * Ensures the datasource URL is in JDBC form (starts with {@code jdbc:}) and that
 * credentials are not embedded in the URL when using postgresql:// style URLs.
 * Railway and some PaaS providers expose {@code DATABASE_URL} as
 * {@code postgresql://user:password@host:port/db}; some JDBC/connection code paths
 * misparse that when passed as jdbc:postgresql://user:password@host:port/db, treating
 * user:password@host as the hostname. This processor normalizes to a JDBC URL without
 * embedded credentials and sets username/password separately.
 */
public class JdbcUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String DATASOURCE_URL_KEY = "spring.datasource.url";
    private static final String DATASOURCE_USERNAME_KEY = "spring.datasource.username";
    private static final String DATASOURCE_PASSWORD_KEY = "spring.datasource.password";
    private static final String DB_URL_KEY = "DB_URL";
    private static final String DATABASE_URL_KEY = "DATABASE_URL";
    private static final String DEFAULT_JDBC_URL = "jdbc:postgresql://localhost:5432/weeklycommit";
    private static final String JDBC_PREFIX = "jdbc:";

    /** Run after ConfigDataEnvironmentPostProcessor so config files are loaded first. */
    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE - 1;
    }

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String url = environment.getProperty(DATASOURCE_URL_KEY);
        if (url == null || url.isBlank()) {
            url = environment.getProperty(DB_URL_KEY);
        }
        if (url == null || url.isBlank()) {
            url = environment.getProperty(DATABASE_URL_KEY);
        }
        if (url == null || url.isBlank()) {
            url = DEFAULT_JDBC_URL;
        }
        url = url.trim();

        Map<String, Object> overrides = new HashMap<>();
        if (url.startsWith(JDBC_PREFIX)) {
            overrides.put(DATASOURCE_URL_KEY, url);
        } else if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
            ParsedPostgresUrl parsed = parsePostgresUrl(url);
            overrides.put(DATASOURCE_URL_KEY, parsed.jdbcUrlWithoutCredentials);
            if (parsed.username != null && environment.getProperty(DATASOURCE_USERNAME_KEY) == null) {
                overrides.put(DATASOURCE_USERNAME_KEY, parsed.username);
            }
            if (parsed.password != null && environment.getProperty(DATASOURCE_PASSWORD_KEY) == null) {
                overrides.put(DATASOURCE_PASSWORD_KEY, parsed.password);
            }
        } else {
            overrides.put(DATASOURCE_URL_KEY, JDBC_PREFIX + url);
        }
        environment.getPropertySources().addFirst(new MapPropertySource("jdbcUrlOverride", overrides));
    }

    /**
     * Parse postgresql://user:password@host:port/database (or postgres://) into
     * a JDBC URL without credentials and separate user/password to avoid
     * driver/host parsing issues (UnknownHostException on user:password@host).
     */
    static ParsedPostgresUrl parsePostgresUrl(String url) {
        String rest = url.startsWith("postgresql://") ? url.substring("postgresql://".length()) : url.substring("postgres://".length());
        int at = rest.lastIndexOf('@');
        String userInfo = at >= 0 ? rest.substring(0, at) : null;
        String hostPortDb = at >= 0 ? rest.substring(at + 1) : rest;

        String username = null;
        String password = null;
        if (userInfo != null && !userInfo.isEmpty()) {
            int firstColon = userInfo.indexOf(':');
            if (firstColon >= 0) {
                username = userInfo.substring(0, firstColon);
                password = userInfo.substring(firstColon + 1);
            } else {
                username = userInfo;
            }
        }

        String path = hostPortDb;
        String query = null;
        int q = hostPortDb.indexOf('?');
        if (q >= 0) {
            path = hostPortDb.substring(0, q);
            query = hostPortDb.substring(q);
        }
        int slash = path.indexOf('/');
        String hostPort = slash >= 0 ? path.substring(0, slash) : path;
        String database = slash >= 0 ? path.substring(slash + 1) : "";

        int lastColon = hostPort.lastIndexOf(':');
        String host = lastColon >= 0 ? hostPort.substring(0, lastColon) : hostPort;
        String port = lastColon >= 0 ? hostPort.substring(lastColon + 1) : "5432";
        if (database.isEmpty()) {
            database = "railway";
        }
        String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + database + (query != null ? query : "");
        return new ParsedPostgresUrl(jdbcUrl, username, password);
    }

    record ParsedPostgresUrl(String jdbcUrlWithoutCredentials, String username, String password) {}
}
