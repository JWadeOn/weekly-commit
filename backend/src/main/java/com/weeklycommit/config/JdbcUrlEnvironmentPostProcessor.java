package com.weeklycommit.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.HashMap;
import java.util.Map;

/**
 * Ensures the datasource URL is in JDBC form (starts with {@code jdbc:}).
 * Railway and some PaaS providers expose {@code DATABASE_URL} as {@code postgresql://...}
 * or {@code postgres://...}; Spring Boot requires {@code jdbc:postgresql://...}.
 * Runs after config data is loaded (high order) and resolves DB_URL/DATABASE_URL
 * directly so normalization works regardless of property source order.
 */
public class JdbcUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String DATASOURCE_URL_KEY = "spring.datasource.url";
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
        // Prefer already-resolved spring.datasource.url, then DB_URL, then DATABASE_URL (e.g. Railway)
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
        String normalized = normalizeToJdbc(url.trim());
        Map<String, Object> overrides = new HashMap<>();
        overrides.put(DATASOURCE_URL_KEY, normalized);
        environment.getPropertySources().addFirst(new MapPropertySource("jdbcUrlOverride", overrides));
    }

    static String normalizeToJdbc(String url) {
        String trimmed = url.trim();
        if (trimmed.startsWith(JDBC_PREFIX)) {
            return trimmed;
        }
        // postgres:// or postgresql:// -> jdbc:postgresql://
        if (trimmed.startsWith("postgresql://")) {
            return JDBC_PREFIX + trimmed;
        }
        if (trimmed.startsWith("postgres://")) {
            return JDBC_PREFIX + "postgresql://" + trimmed.substring("postgres://".length());
        }
        return JDBC_PREFIX + trimmed;
    }
}
