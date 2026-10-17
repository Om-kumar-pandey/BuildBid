# syntax=docker/dockerfile:1
FROM maven:3.9.9-eclipse-temurin-17 AS build

WORKDIR /app

COPY pom.xml .

RUN --mount=type=cache,target=/root/.m2/repository \
    for i in 1 2 3; do \
        mvn -B dependency:go-offline && break || { \
            if [ "$i" -lt 3 ]; then \
                echo "dependency:go-offline failed (attempt $i of 3). Retrying in 10s..."; \
                sleep 10; \
            else \
                echo "dependency:go-offline failed after 3 attempts."; \
                exit 1; \
            fi; \
        }; \
    done

COPY src ./src

RUN --mount=type=cache,target=/root/.m2/repository \
    for i in 1 2 3; do \
        mvn -B clean package -DskipTests && break || { \
            if [ "$i" -lt 3 ]; then \
                echo "mvn clean package failed (attempt $i of 3). Retrying in 10s..."; \
                sleep 10; \
            else \
                echo "mvn clean package failed after 3 attempts."; \
                exit 1; \
            fi; \
        }; \
    done

FROM eclipse-temurin:17-jre

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
