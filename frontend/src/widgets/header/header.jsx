import React from "react";
import { Avatar } from "@material-tailwind/react";

const Header = () => {
  return (
    <div className="flex h-[4rem] w-full items-center bg-[#151515] px-[1rem] pt-[2rem]">
      <a href="/">
        <Avatar
          src="/img/logo.svg"
          className="h-auto w-[186px] !rounded-none"
        />
      </a>
    </div>
  );
};

export default Header;
