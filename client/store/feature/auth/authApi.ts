import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axiosBaseQuery";
import Cookies from "js-cookie";

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: axiosBaseQuery({ baseUrl: "" }),
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        data: credentials,
      }),
      transformResponse: (response: { accessToken: string }) => {
        if (response.accessToken) {
          localStorage.setItem("accessToken", response.accessToken);
          Cookies.set("accessToken", response.accessToken, {
            expires: 7,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
          });
        }
        return response;
      },
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: "/auth/register",
        method: "POST",
        data: userData,
      }),
    }),
    getMe: builder.query({
      query: () => ({
        url: "/auth/me",
        method: "GET",
      }),
    }),
    logout: builder.mutation({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      onQueryStarted: async (_, { queryFulfilled }) => {
        try {
          await queryFulfilled;
          localStorage.removeItem("accessToken");
          Cookies.remove("accessToken");
        } catch (error) {
          console.error("Logout failed", error);
        }
      },
    }),
    refresh: builder.mutation({
      query: () => ({
        url: "/auth/refresh",
        method: "POST",
      }),
      transformResponse: (response: { accessToken: string }) => {
        if (response.accessToken) {
          localStorage.setItem("accessToken", response.accessToken);
          Cookies.set("accessToken", response.accessToken, {
            expires: 7,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
          });
        }
        return response;
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetMeQuery,
  useLogoutMutation,
  useRefreshMutation,
} = authApi;
