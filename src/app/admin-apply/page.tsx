"use client";
import { useState } from "react";
import Link from "next/link";
import InlineError from "@/components/InlineError";
import { api } from "@/lib/api";
const fields = [["organizationName","단체명","text"],["university","소속 대학","text"],["department","소속 학과","text"],["contactName","담당자 이름","text"],["email","학교 메일","email"],["phone","연락처","tel"],["channelUrl","공식 채널 링크","url"]] as const;
export default function Apply(){
 const [error,setError]=useState(""); const [done,setDone]=useState(false);
 return <main className="login-shell"><section className="login-card"><h1>단체 관리자 신청</h1><p className="muted">신청 내용을 확인한 뒤 이메일로 결과를 안내해 드려요.</p>
 {done?<><p>신청이 접수됐어요. 검토 후 안내 메일을 보내드립니다.</p><Link className="secondary" href="/login">로그인으로</Link></>:<form className="role-buttons" onSubmit={async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));try{await api("/admin-applications",{method:"POST",auth:false,body:data});setDone(true)}catch(err){setError((err as Error).message)}}}>
 {fields.map(([id,label,type])=><div className="form-group" key={id}><label htmlFor={id}>{label}</label><input id={id} name={id} type={type} required maxLength={500}/></div>)}
 <div className="form-group"><label htmlFor="reason">신청 사유</label><textarea id="reason" name="reason" required maxLength={3000} rows={4}/></div><InlineError error={error}/><button className="primary">신청하기</button></form>}</section></main>
}
