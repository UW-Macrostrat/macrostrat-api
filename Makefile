DOCKER_IMAGE = v3
DOCKER_TAG = latest

.PHONY: build run stop clean

build:
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .

run:
    docker run -it $(DOCKER_IMAGE):$(DOCKER_TAG) /bin/bash
stop:
	docker stop $(DOCKER_IMAGE)
	docker rm $(DOCKER_IMAGE)

clean:
	docker rmi $(DOCKER_IMAGE):$(DOCKER_TAG)
