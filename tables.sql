CREATE TABLE `list_categories` (
  `id` int(2) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=latin1;

CREATE TABLE `list_sex` (
  `id` int(2) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=latin1;

CREATE TABLE `user_roles` (
  `id` int(5) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `isactive` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=latin1;

CREATE TABLE `users` (
  `id` int(5) NOT NULL AUTO_INCREMENT,
  `entrydate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_name` varchar(20) NOT NULL,
  `user_password` varchar(255) NOT NULL,
  `profilepic` varchar(255) DEFAULT '',
  `activation_hash` longtext COMMENT 'Activation Hash',
  `passwordexpire` tinyint(1) DEFAULT '0',
  `isactive` tinyint(1) DEFAULT '1',
  `roleid` int(2) NOT NULL,
  `lastlogin` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `lastlogout` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `sessionid` longtext,
  PRIMARY KEY (`id`),
  KEY `roleid` (`roleid`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`roleid`) REFERENCES `user_roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=latin1;

CREATE TABLE `datasets` (
  `id` int(5) NOT NULL AUTO_INCREMENT,
  `entrydate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `first_name` varchar(50) NOT NULL COMMENT 'First Name',
  `last_name` varchar(50) NOT NULL COMMENT 'Last Name',
  `sex_id` int(2) NOT NULL COMMENT 'Sex',
  `category_id` int(2) NOT NULL COMMENT 'Category',
  `description` longtext COMMENT 'Description',
  `notes` longtext NOT NULL COMMENT 'Notes',
  `isactive` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Active',
  `user_id` int(5) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `datasets_ibfk_1` (`user_id`),
  KEY `datasets_ibfk_2` (`sex_id`),
  KEY `datasets_ibfk_3` (`category_id`),
  CONSTRAINT `datasets_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `datasets_ibfk_2` FOREIGN KEY (`sex_id`) REFERENCES `list_sex` (`id`) ON DELETE CASCADE,
  CONSTRAINT `datasets_ibfk_3` FOREIGN KEY (`category_id`) REFERENCES `list_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=latin1;

CREATE TABLE `dataset_images` (
  `id` int(5) NOT NULL AUTO_INCREMENT,
  `dataset_id` int(5) NOT NULL COMMENT 'Dataset',
  `entrydate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `dataset_filename` varchar(255) NOT NULL COMMENT 'Image',
  `date` varchar(50) NOT NULL COMMENT 'Date',
  `town` varchar(100) NOT NULL COMMENT 'Town',
  `description` longtext COMMENT 'Description',
  `notes` longtext NOT NULL COMMENT 'Notes',
  `user_id` int(5) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `dataset_images_ibfk_1` (`dataset_id`),
  KEY `dataset_images_ibfk_3` (`user_id`),
  CONSTRAINT `dataset_images_ibfk_1` FOREIGN KEY (`dataset_id`) REFERENCES `datasets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `dataset_images_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=latin1;
