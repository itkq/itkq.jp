all: public

public:
	./script/deploy.sh

local:
	hugo server -w -t sustain -p 1313 --uglyURLs
