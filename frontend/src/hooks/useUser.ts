import { useDispatch, useSelector } from 'react-redux';
import {
  setUserDataAction,
  cleanUserDataAction,
} from '../store/userSlice';
import { RootState } from '../store/types';

type State = {
  userInfo: {
    Data: {
      login: string;
    };
  };
};

export const useUser = () => {
  const { Data } = useSelector((state: RootState) => state.user);

  const { login } = Data; // возьмем у юзера логин

  const dispatch = useDispatch();

  const setUser = (value: State) => { // метод для загрузки логина юзера в стор
    dispatch(setUserDataAction(value.userInfo));
  };

  const resetUser = () => { // метод для чистки слайса
    dispatch(cleanUserDataAction());
  };

  return {
    login,
    setUser,
    resetUser,
  };
};